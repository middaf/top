import React from 'react';
import { supabaseDb } from "../../database/supabaseUtils";
import { supabase } from "../../database/supabaseConfig";

const UnitWithdrawSect = ({ setProfileState, withdrawData }) => {
    const notificationPush = {
        message: `Your $${withdrawData?.amount} withdrawal transaction has been confirmed. $${withdrawData?.amount} is on its way to your wallet address now`,
        idnum: withdrawData.idnum,
        status: "unseen"
    };

    const handleActiveInvestment = async () => {
        try {
            await supabaseDb.updateWithdrawalStatus(withdrawData?.id, {
                status: "Active",
                date: new Date().toISOString(),
                authStatus: "seen"
            });

            await supabaseDb.createNotification(notificationPush);

            // Send email notification to user
            try {
                // Get user email from userlogs table
                const { data: userData, error: userError } = await supabase
                    .from('userlogs')
                    .select('email, name')
                    .eq('idnum', withdrawData.idnum)
                    .single();

                if (!userError && userData?.email) {
                    const emailSubject = 'Withdrawal Confirmed - TopMintInvest';
                    const emailMessage = `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #28a745;">💰 Withdrawal Confirmed!</h2>
                        <p>Dear ${userData.name || 'User'},</p>
                        <p>Great news! Your withdrawal request has been processed and confirmed.</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                          <h3 style="margin-top: 0;">Withdrawal Details:</h3>
                          <ul style="list-style: none; padding: 0;">
                            <li><strong>Amount:</strong> $${withdrawData?.amount}</li>
                            <li><strong>Fee:</strong> $${withdrawData?.widthrawalFee}</li>
                            <li><strong>Payment Method:</strong> ${withdrawData?.paymentOption}</li>
                            <li><strong>Wallet Address:</strong> ${withdrawData?.address}</li>
                          </ul>
                        </div>
                        <p>Your funds are now being processed and will be sent to your wallet shortly. Processing times may vary depending on the payment method.</p>
                        <p>If you have any questions, please contact our support team.</p>
                        <p>Best regards,<br>TopMintInvest Team</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                          This is an automated message. Please do not reply to this email.
                        </p>
                      </div>
                    `;

                    const emailResponse = await fetch('/api/send-email', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        to: userData.email,
                        subject: emailSubject,
                        message: emailMessage,
                        type: 'withdrawal_confirmation'
                      })
                    });

                    if (emailResponse.ok) {
                      console.log('Withdrawal confirmation email sent successfully');
                    } else {
                      console.error('Failed to send withdrawal confirmation email');
                    }
                }
            } catch (emailError) {
                console.error('Error sending withdrawal confirmation email:', emailError);
                // Don't throw here - email failure shouldn't block withdrawal confirmation
            }

            setProfileState("Withdrawals");
        } catch (error) {
            console.error("Error confirming withdrawal:", error);
        }
    };


  return (
    <div className="profileMainCntn">
      <div className="profileEditableDisplay">
          <h2>Withdrawal Details</h2>
          <div className="theFormField">
            <div className="unitInputField">
              <label htmlFor="name">Amount</label>
              <input type="text" disabled value={withdrawData?.amount} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Withdrawal Fee</label>
              <input type="text" disabled value={withdrawData?.widthrawalFee} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Withdrawal Status</label>
              <input type="text" disabled value={withdrawData?.status} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Investment Cryptic Id.</label>
              <input type="text" disabled value={withdrawData?.id} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Investment Register Id.</label>
              <input type="text" disabled value={withdrawData?.idnum} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Payment Option</label>
              <input type="text" disabled value={withdrawData?.paymentOption} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Wallet Address</label>
              <input type="text" disabled value={withdrawData?.address} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Date</label>
              <input type="text" disabled value={new Date(withdrawData?.date).toLocaleDateString("en-US", {day: "numeric", month: "short", year: "numeric", }) } />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Time</label>
              <input type="text" disabled value={new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, }).format(new Date(withdrawData?.date))} />
            </div>
            
          </div>

            <div className="flex-align-jusc">
                {
                    withdrawData?.status === "Pending" && (
                        <button type="button" onClick={handleActiveInvestment} className='activateBtn'>Confirm Withdrawal</button>
                    )
                }
            </div>
        </div>
    </div>
  )
}

export default UnitWithdrawSect
