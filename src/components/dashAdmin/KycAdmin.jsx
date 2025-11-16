import React, { useEffect, useState } from 'react';
import { supabaseDb } from '../../database/supabaseUtils';
import { supabase } from '../../database/supabaseConfig';

export default function KycAdmin({ currentUser }) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    // Fetch initial KYC requests
    const fetchKycRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('kyc')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching KYC requests:', error);
          return;
        }
        
        if (data) {
          setRequests(data);
        }
      } catch (err) {
        console.error('Failed to fetch KYC requests:', err);
      }
    };

    fetchKycRequests();

    // Set up real-time subscription
    const subscription = supabase
      .channel('kyc-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kyc'
      }, (payload) => {
        fetchKycRequests(); // Refresh data on any change
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateKyc = async (kycId, newStatus) => {
    try {
      // First get the KYC record
      const { data: kycData, error: kycError } = await supabase
        .from('kyc')
        .select('*')
        .eq('id', kycId)
        .single();

      if (kycError || !kycData) throw new Error('KYC not found');

      // Update KYC status
      const { error: updateKycError } = await supabase
        .from('kyc')
        .update({
          status: newStatus
        })
        .eq('id', kycId);

      if (updateKycError) throw updateKycError;

      // Update user KYC status if userId exists
      if (kycData.user_id) {
        console.log('Updating user KYC status for user ID:', kycData.user_id, 'to status:', newStatus);
        const { error: updateUserError } = await supabase
          .from('userlogs')
          .update({
            kyc_status: newStatus
          })
          .eq('id', kycData.user_id);

        if (updateUserError) {
          console.error('Failed to update user KYC status:', updateUserError);
          throw updateUserError;
        }
        console.log('User KYC status updated successfully');

        // Create notification for user
        const notificationMessage = newStatus === 'Verified'
          ? '🎉 Congratulations! Your KYC verification has been approved. You can now make withdrawals and access all platform features.'
          : '❌ Your KYC verification has been rejected. Please check your submitted documents and try again, or contact support for assistance.';

        const notificationPush = {
          title: `KYC ${newStatus}`,
          message: notificationMessage,
          idnum: kycData.idnum,
          status: 'unseen',
          type: newStatus === 'Verified' ? 'success' : 'error'
        };

        const notificationResult = await supabaseDb.createNotification(notificationPush);
        if (notificationResult.error) {
          console.error('Notification creation error:', notificationResult.error);
          // Don't throw here - notification failure shouldn't block KYC update
        } else {
          console.log('KYC notification created successfully');
        }

        // Send email notification to user
        try {
          // Get user email from userlogs table
          const { data: userData, error: userError } = await supabase
            .from('userlogs')
            .select('email, name')
            .eq('idnum', kycData.idnum)
            .single();

          if (!userError && userData?.email) {
            const emailSubject = `KYC Verification ${newStatus}`;
            const emailMessage = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: ${newStatus === 'Verified' ? '#28a745' : '#dc3545'};">${emailSubject}</h2>
                <p>Dear ${userData.name || 'User'},</p>
                <p>${notificationMessage}</p>
                ${newStatus === 'Verified'
                  ? '<p>You can now access all withdrawal features and premium services on our platform.</p>'
                  : '<p>Please review your submitted documents and contact our support team if you need assistance.</p>'
                }
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
                type: 'kyc_verification'
              })
            });

            if (emailResponse.ok) {
              console.log('KYC email notification sent successfully');
            } else {
              console.error('Failed to send KYC email notification');
            }
          }
        } catch (emailError) {
          console.error('Error sending KYC email notification:', emailError);
          // Don't throw here - email failure shouldn't block KYC update
        }
      }

      alert(`KYC ${newStatus.toLowerCase()} successfully!`);
    } catch (err) {
      console.error('KYC update error', err);
      alert(`Failed to ${newStatus.toLowerCase()} KYC. Please try again.`);
    }
  };

  return (
    <div className="investmentMainCntn">
      <div className="overviewSection">
        <h2>KYC Requests ({requests.length})</h2>
      </div>

      <div className="myinvestmentSection">
        {requests.length === 0 ? (
          <div className="emptyTable">
            <i className="icofont-exclamation-tringle"></i>
            <p>No KYC requests.</p>
          </div>
        ) : (
          <div className="kycTableContainer">
            <table className="kycTable">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>User Name</th>
                  <th>User ID</th>
                  <th>ID Type</th>
                  <th>ID Number</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td>{r.user_name || 'N/A'}</td>
                    <td className="cryptic-id">{r.user_id ? r.user_id.substring(0, 8) + '...' : 'N/A'}</td>
                    <td>{r.id_type || 'N/A'}</td>
                    <td className="id-number">
                      {r.status === 'Verified' ? (r.id_number || 'N/A') : '••••••••'}
                    </td>
                    <td>
                      <span className={`kyc-status ${r.status?.toLowerCase() || 'submitted'}`}>
                        {r.status === 'pending' || !r.status ? 'Submitted' : r.status}
                      </span>
                    </td>
                    <td>{new Date(r.created_at || r.submitted_at).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}</td>
                    <td>
                      <div className="action-buttons">
                        {r.status !== 'Verified' && (
                          <button
                            className="action-btn verify"
                            onClick={() => updateKyc(r.id, 'Verified')}
                          >
                            Verify
                          </button>
                        )}
                        {r.status !== 'Rejected' && (
                          <button
                            className="action-btn reject"
                            onClick={() => updateKyc(r.id, 'Rejected')}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
