import React, { useEffect, useState } from 'react';
import { supabaseDb } from '../../database/supabaseUtils';
import { supabase } from '../../database/supabaseConfig';

export default function LoansAdmin({ setProfileState, currentUser }) {
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    // Initial fetch
    const fetchLoans = async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setLoans(data);
      }
    };

    fetchLoans();

    // Real-time subscription
    const channel = supabase
      .channel('loans_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, (payload) => {
        fetchLoans(); // Refetch on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const changeStatus = async (loanId, newStatus) => {
    try {
      await supabaseDb.updateLoanStatus(loanId, {
        status: newStatus,
        approvedBy: currentUser?.id || null,
        approvedByName: currentUser?.name || 'Admin'
      });

      // Add notification
      const loan = loans.find(l => l.id === loanId);
      if (loan) {
        await supabaseDb.createNotification({
          idnum: loan.idnum,
          user_id: loan.user_id,
          title: `Loan ${newStatus}`,
          message: `Your loan request has been ${newStatus.toLowerCase()}.`,
          status: 'unseen'
        });

        // Send email notification to user
        try {
          // Get user email from userlogs table
          const { data: userData, error: userError } = await supabase
            .from('userlogs')
            .select('email, name')
            .eq('idnum', loan.idnum)
            .single();

          if (!userError && userData?.email) {
            const emailSubject = `Loan Request ${newStatus} - TopMintInvest`;
            const emailMessage = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: ${newStatus === 'Approved' ? '#28a745' : '#dc3545'};">${newStatus === 'Approved' ? '✅' : '❌'} Loan Request ${newStatus}</h2>
                <p>Dear ${userData.name || 'User'},</p>
                <p>Your loan request has been ${newStatus.toLowerCase()}.</p>
                ${newStatus === 'Approved' ? `
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Loan Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                      <li><strong>Amount:</strong> $${loan.amount}</li>
                      <li><strong>Purpose:</strong> ${loan.purpose || 'Not specified'}</li>
                      <li><strong>Duration:</strong> ${loan.duration || 'As agreed'}</li>
                    </ul>
                  </div>
                  <p>The loan amount will be credited to your account shortly. Please review the loan terms and conditions.</p>
                ` : `
                  <p>If you have any questions about this decision or would like to discuss alternative options, please contact our support team.</p>
                `}
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
                type: 'loan_status'
              })
            });

            if (emailResponse.ok) {
              console.log('Loan status email sent successfully');
            } else {
              console.error('Failed to send loan status email');
            }
          }
        } catch (emailError) {
          console.error('Error sending loan status email:', emailError);
          // Don't throw here - email failure shouldn't block loan status update
        }
      }

      alert('Loan updated successfully');
    } catch (err) {
      console.error('Error updating loan status:', err);
      alert('Error updating loan status: ' + err.message);
    }
  };

  return (
    <div className="investmentMainCntn">
      <div className="overviewSection">
        <h2>All Loan Requests ({loans.length})</h2>
      </div>

      <div className="myinvestmentSection">
        {loans.length === 0 ? (
          <div className="emptyTable">
            <i className="icofont-exclamation-tringle"></i>
            <p>No loan requests.</p>
          </div>
        ) : (
          <div className="historyTable">
            <div className="investmentTablehead header">
              <div className="unitheadsect">S/N</div>
              <div className="unitheadsect">User</div>
              <div className="unitheadsect">Amount</div>
              <div className="unitheadsect">Purpose</div>
              <div className="unitheadsect">Status</div>
              <div className="unitheadsect">Requested On</div>
              <div className="unitheadsect">Actions</div>
            </div>
            {loans.map((ln, idx) => (
              <div className="investmentTablehead" key={ln.id}>
                <div className="unitheadsect">{idx + 1}</div>
                <div className="unitheadsect">{ln.user_name || ln.idnum}</div>
                <div className="unitheadsect">${(ln.amount || 0).toLocaleString()}</div>
                <div className="unitheadsect">{ln.purpose || '-'}</div>
                <div className="unitheadsect">{ln.status}</div>
                <div className="unitheadsect">{ln.created_at ? new Date(ln.created_at).toLocaleString() : '-'}</div>
                <div className="unitheadsect">
                  {ln.status !== 'Approved' && <button onClick={() => changeStatus(ln.id, 'Approved')}>Approve</button>}
                  {ln.status !== 'Declined' && <button onClick={() => changeStatus(ln.id, 'Declined')}>Decline</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
