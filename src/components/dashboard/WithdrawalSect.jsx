import {useEffect, useState} from "react";
import { db } from "../../database/firebaseConfig";
import { doc, where, collection, query, onSnapshot } from "firebase/firestore";

const WithdrawalSect = ({currentUser, setWidgetState, totalBonus, totalCapital, totalROI, setProfileState, setWithdrawData}) => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [paymentOption, setPaymentOption] = useState('Bitcoin');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');
    const [bankRoutingSwift, setBankRoutingSwift] = useState('');
    const [showCodeNotification, setShowCodeNotification] = useState(false);
    const colRefWith = collection(db, "withdrawals");
    const q3 = query(colRefWith, where("idnum", "==", currentUser?.idnum));

    useEffect(() => {
      const unsubscribe = onSnapshot(q3, (snapshot) => {
        const utilNotif = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        setWithdrawals(utilNotif);
      });

      return () => unsubscribe();
    }, [q3]);

  return (
    <div className='widthdrawMainSect'>
        <div className="topmostWithdraw">
            <h2>Total Balance: <span>${`${(parseFloat(currentUser?.balance || 0) + parseFloat(currentUser?.bonus || 0)).toLocaleString()}`}</span></h2>
            
            {/* KYC Status Indicator */}
            {(!currentUser?.kycStatus || currentUser?.kycStatus !== 'verified') && (
                <div style={{
                    backgroundColor: 'rgba(220, 18, 98, 0.1)',
                    border: '2px solid var(--danger-clr)',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    marginBottom: '1rem',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    maxWidth: '500px'
                }}>
                    <i className="icofont-warning" style={{ 
                        fontSize: '1.3rem', 
                        color: 'var(--danger-clr)',
                        flexShrink: 0
                    }}></i>
                    <span style={{ fontSize: '0.9em', color: 'var(--text-clr1)' }}>
                        <strong style={{ color: 'var(--danger-clr)' }}>KYC Required:</strong> Complete KYC verification in Profile to enable withdrawals.
                    </span>
                </div>
            )}
            
            <div style={{display:'flex',flexDirection:'column',gap:16,width:'100%',maxWidth:400}}>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Enter amount to withdraw"
                        style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #ddd',
                            fontSize: '1rem'
                        }}
                    />
                    <select 
                        value={paymentOption}
                        onChange={(e) => setPaymentOption(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #ddd',
                            fontSize: '1rem'
                        }}
                    >
                        <option value="Bitcoin">Bitcoin</option>
                        <option value="Ethereum">Ethereum</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                    {paymentOption === 'Bank Transfer' && (
                        <>
                            <input
                                type="text"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="Bank Name"
                                required
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #ddd',
                                    fontSize: '1rem'
                                }}
                            />
                            <input
                                type="text"
                                value={bankAccountNumber}
                                onChange={(e) => setBankAccountNumber(e.target.value)}
                                placeholder="Account Number"
                                required
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #ddd',
                                    fontSize: '1rem'
                                }}
                            />
                            <input
                                type="text"
                                value={bankAccountName}
                                onChange={(e) => setBankAccountName(e.target.value)}
                                placeholder="Account Holder Name"
                                required
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #ddd',
                                    fontSize: '1rem'
                                }}
                            />
                            <input
                                type="text"
                                value={bankRoutingSwift}
                                onChange={(e) => setBankRoutingSwift(e.target.value)}
                                placeholder="Routing/Swift Code (Optional)"
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #ddd',
                                    fontSize: '1rem'
                                }}
                            />
                        </>
                    )}
                </div>
                <button type="button" onClick={() => {
                    // Check KYC status first
                    if (!currentUser?.kycStatus || currentUser?.kycStatus !== 'verified') {
                        alert('KYC verification required. Please complete KYC verification in the Profile section before making a withdrawal.');
                        return;
                    }
                    
                    const amt = parseFloat(withdrawAmount);
                    if (!withdrawAmount || isNaN(amt) || amt <= 0) {
                        alert('Please enter a valid withdrawal amount');
                        return;
                    }
                    if (amt < 200) {
                        alert('Minimum withdrawal amount is $200');
                        return;
                    }
                    // Validate bank fields if bank transfer selected
                    if (paymentOption === 'Bank Transfer') {
                        if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
                            alert('Please fill in all required bank details (Bank Name, Account Number, Account Holder Name)');
                            return;
                        }
                    }
                    const totalBalance = parseFloat(currentUser?.balance || 0) + parseFloat(currentUser?.bonus || 0);
                    if (amt > totalBalance) {
                        alert('Withdrawal amount cannot exceed your total balance');
                        return;
                    }
                    // Go directly to Withdrawal Payment page with data
                    if (setWithdrawData) {
                        setWithdrawData({
                            amount: amt,
                            capital: amt,
                            paymentOption: paymentOption,
                            bankName: paymentOption === 'Bank Transfer' ? bankName : '',
                            bankAccountNumber: paymentOption === 'Bank Transfer' ? bankAccountNumber : '',
                            bankAccountName: paymentOption === 'Bank Transfer' ? bankAccountName : '',
                            bankRoutingSwift: paymentOption === 'Bank Transfer' ? bankRoutingSwift : '',
                            idnum: currentUser?.idnum,
                            userName: currentUser?.userName || currentUser?.name
                        });
                    }
                    if (setProfileState) {
                        setProfileState("Withdrawal Payment");
                    }
                }} style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '10px 16px',
                    background: '#008069',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}>Proceed with withdrawal</button>
            </div>
        </div>
        {
            withdrawals.length > 0 ? (
                <div className="historyTable">
                    <div className="investmentTablehead header">
                        <div className="unitheadsect">S/N</div>
                        <div className="unitheadsect">Transaction ID</div>
                        <div className="unitheadsect">Amount</div>
                        <div className="unitheadsect">Status</div>
                        <div className="unitheadsect">Payment Option</div>
                    </div>
                    {
                        withdrawals.map((elem, idx) => (
                            <div className="investmentTablehead" key={`${elem.idnum}-wUser${idx}`}>
                                <div className="unitheadsect">{idx + 1}</div>
                                <div className="unitheadsect">{elem?.id}</div>
                                <div className="unitheadsect">${elem?.amount}</div>
                                <div className="unitheadsect"><span style={{color: `${elem?.status === "Pending" ? "#F9F871" : "#2DC194"}`}}>{elem?.status}</span></div>
                                <div className="unitheadsect">{elem?.paymentOption}</div>
                            </div>
                        ))
                    }
                </div>

            ) : (

                <div className="emptyTable">
                    <i className="icofont-exclamation-tringle"></i>
                    <p>
                        Your withdrawal history is currently empty.{" "}
                        <button onClick={() => {setWidgetState({
                            state: true,
                            type: "withdraw",
                        })}}>Withdraw now</button>
                    </p>
                </div>
            )
        }
        <div className="widthdrawalGuides">
            <h2>Withdrawal Guidelines</h2>
            <div className="guides">
                <p>- To initiate a withdrawal, you must first request a withdrawal code from the admin. This code is required to process your withdrawal request.</p>
                <p>- Once you receive your withdrawal code, select your preferred withdrawal method and enter the amount you want to withdraw, then click &quot;Proceed&quot;.</p>
                <p>- We provide three (3) withdrawal methods (Bitcoin, Ethereum, and Bank Transfer).</p>
                <p>- Withdrawal codes are specific to your account and the requested amount. They cannot be reused.</p>
                <p>- Requests for withdrawals can be made at any time via this website, but will require admin approval and a valid withdrawal code.</p>
                <p>- Withdrawals are capped at the amount of funds that are currently in the account (Minimum withdrawal amount is $200).</p>
                <p>- A withdrawal processing fee is required to be paid before a withdrawal can be made.</p>
                <p>- Please contact support if you have not received your withdrawal code within 24 hours of requesting it.</p>
            </div>
        </div>

        {/* Notification modal after requesting withdrawal code */}
        {showCodeNotification && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: 8,
                    padding: 24,
                    maxWidth: 400,
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}>
                    <h2>Withdrawal Code Requested</h2>
                    <p style={{margin: '16px 0', color: '#666'}}>
                        Your withdrawal code request has been sent to the admin. You will receive your code via the chat within 24 hours.
                    </p>
                    <div style={{display: 'flex', gap: 8, marginTop: 24}}>
                        <button
                            onClick={() => {
                                setShowCodeNotification(false);
                                window.dispatchEvent(new CustomEvent('openChatBot', { detail: {} }));
                            }}
                            style={{flex: 1, padding: '10px 16px', backgroundColor: '#f9f871', border: 'none', borderRadius: 6, cursor: 'pointer'}}
                        >
                            Contact Admin
                        </button>
                        <button
                            onClick={() => setShowCodeNotification(false)}
                            style={{flex: 1, padding: '10px 16px', backgroundColor: '#ddd', border: 'none', borderRadius: 6, cursor: 'pointer'}}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  )
}

export default WithdrawalSect
