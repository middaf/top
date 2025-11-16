import {useEffect, useState} from "react";
import { useRouter } from "next/router";
import { supabaseDb, supabaseRealtime } from "../../database/supabaseUtils";
import { supabase } from "../../database/supabaseConfig";

const WithdrawalSect = ({currentUser, setWidgetState, totalBonus, totalCapital, totalROI, setProfileState, setWithdrawData}) => {
    const router = useRouter();
    const [withdrawals, setWithdrawals] = useState([]);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [paymentOption, setPaymentOption] = useState('Bitcoin');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');
    const [bankRoutingSwift, setBankRoutingSwift] = useState('');
    const [kycStatus, setKycStatus] = useState('pending');
    const normalizedKycStatus = (kycStatus || '').toLowerCase();
    const isKycVerified = normalizedKycStatus === 'verified';
    useEffect(() => {
      const fetchWithdrawals = async () => {
        if (!currentUser?.idnum) return;
        
        try {
          const { data, error } = await supabaseDb.getWithdrawalsByIdnum(currentUser.idnum);
          if (!error && data) {
            setWithdrawals(data);
          }
        } catch (err) {
          console.error('Error calling getWithdrawalsByIdnum:', err);
        }
      };

      const fetchKycStatus = async () => {
        console.log('Fetching KYC status for user:', currentUser?.id);
        if (!currentUser?.id) {
          console.log('No user ID available for KYC fetch');
          return;
        }
        
        try {
          const { data, error } = await supabaseDb.getKYCByUserId(currentUser.id);
          console.log('KYC fetch result:', { data, error });
                    if (!error && data && data.length > 0) {
                        const status = (data[0].status || 'pending').toLowerCase();
                        console.log('Setting KYC status to:', status);
                        setKycStatus(status);
          } else {
            console.log('No KYC data found, setting to pending');
            setKycStatus('pending');
          }
        } catch (err) {
          console.error('Error fetching KYC status:', err);
          setKycStatus('pending');
        }
      };

      fetchWithdrawals();
      fetchKycStatus();

      // Set up real-time subscriptions
      let withdrawalsSubscription = null;
      let kycSubscription = null;
      
      if (currentUser?.idnum) {
        withdrawalsSubscription = supabaseRealtime.subscribeToWithdrawals(currentUser.idnum, (payload) => {
          console.log('Withdrawal change:', payload);
          // Refresh withdrawals when there's a change
          fetchWithdrawals();
        });
      }

      if (currentUser?.id) {
        kycSubscription = supabase
          .channel('user-kyc-withdrawal')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'kyc',
            filter: `user_id=eq.${currentUser.id}`
          }, (payload) => {
            console.log('🔄 KYC status change in withdrawal:', payload);
            if (payload.new) {
              const newStatus = (payload.new.status || 'pending').toLowerCase();
              console.log('📝 Updating KYC status in WithdrawalSect to:', newStatus);
              setKycStatus(newStatus);
            } else if (payload.eventType === 'DELETE') {
              console.log('🗑️ KYC deleted, setting to pending');
              setKycStatus('pending');
            }
          })
          .subscribe();
      }

      return () => {
        if (withdrawalsSubscription) withdrawalsSubscription.unsubscribe();
        if (kycSubscription) kycSubscription.unsubscribe();
      };
    }, [currentUser?.idnum]);

  return (
    <div className='widthdrawMainSect'>
        <div className="topmostWithdraw">
            <h2 style={{ color: '#F3F9FF', fontSize: '1.5em' }}>
              Total Balance:
              <span style={{ color: '#0672CD', fontWeight: 'bold' }}>
                ${(() => {
                  // Calculate total available balance like in the profile dashboard
                  const userBalance = parseFloat(currentUser?.balance || 0);
                  const capital = parseFloat(totalCapital || 0);
                  const roi = parseFloat(totalROI || 0);
                  const bonus = parseFloat(totalBonus || 0);
                  const total = userBalance + capital + roi + bonus;
                  console.log('Withdrawal balance calculation:', {
                    userBalance,
                    capital: totalCapital,
                    roi: totalROI,
                    bonus: totalBonus,
                    total,
                    currentUser
                  });
                  return total.toLocaleString();
                })()}
              </span>
              {!currentUser?.balance && currentUser?.balance !== 0 && (
                <span style={{fontSize: '0.8rem', color: '#999', marginLeft: '10px'}}>(Loading...)</span>
              )}
            </h2>
            
            {/* KYC Status Indicator */}
            {!isKycVerified && (
                <div style={{
                    backgroundColor: 'rgba(220, 18, 98, 0.1)',
                    border: '2px solid var(--danger-clr)',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    marginBottom: '1rem',
                    marginTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    maxWidth: '500px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                    }}>
                        <i className="icofont-warning" style={{ 
                            fontSize: '1.3rem', 
                            color: 'var(--danger-clr)',
                            flexShrink: 0
                        }}></i>
                        <span style={{ fontSize: '0.9em', color: 'var(--text-clr1)' }}>
                            <strong style={{ color: 'var(--danger-clr)' }}>KYC Required:</strong> Complete KYC verification to enable withdrawals.
                        </span>
                    </div>
                    <button
                        onClick={() => router.push('/kyc')}
                        style={{
                            background: 'var(--primary-clr)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '10px 16px',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            alignSelf: 'flex-start',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#0556a3'}
                        onMouseOut={(e) => e.target.style.background = 'var(--primary-clr)'}
                    >
                        Click here to complete your KYC
                    </button>
                </div>
            )}
            
            {/* KYC Verified Indicator */}
            {isKycVerified && (
                <div style={{
                    background: 'linear-gradient(135deg, #067c4d 0%, #0a9b6b 100%)',
                    border: '2px solid #067c4d',
                    borderRadius: '12px',
                    padding: '1.2rem',
                    marginBottom: '1.5rem',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: '0 4px 15px rgba(6, 124, 77, 0.3)',
                    animation: 'fadeIn 0.5s ease-in-out',
                    maxWidth: '600px'
                }}>
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <i className="icofont-check" style={{ 
                            fontSize: '1.8rem', 
                            color: 'white',
                            fontWeight: 'bold'
                        }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ 
                            color: 'white', 
                            margin: '0 0 0.3rem 0', 
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                            ✅ KYC Successfully Verified!
                        </h3>
                        <p style={{ 
                            color: 'rgba(255, 255, 255, 0.9)', 
                            margin: 0, 
                            fontSize: '0.95rem',
                            lineHeight: '1.4'
                        }}>
                            Your identity has been verified. You can now make withdrawals and access all platform features without restrictions.
                        </p>
                    </div>
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
                    if (!isKycVerified) {
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
                    const totalBalance = (() => {
                        const userBalance = parseFloat(currentUser?.balance || 0);
                        const capital = parseFloat(totalCapital || 0);
                        const roi = parseFloat(totalROI || 0);
                        const bonus = parseFloat(totalBonus || 0);
                        return userBalance + capital + roi + bonus;
                    })();
                    if (amt > totalBalance) {
                        alert(`Withdrawal amount cannot exceed your total balance of $${totalBalance.toLocaleString()}`);
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

    </div>
  )
}

export default WithdrawalSect
