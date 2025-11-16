import { supabase } from '../database/supabaseConfig';
import { config } from './config';

export async function cleanupExpiredCodes() {
  try {
    const now = new Date().toISOString();
    const { data: expiredCodes, error } = await supabase
      .from('withdrawal_codes')
      .select('id')
      .lte('expires_at', now);

    if (error) throw error;
    if (!expiredCodes || expiredCodes.length === 0) return;

    // Delete expired codes
    const ids = expiredCodes.map(code => code.id);
    const { error: deleteError } = await supabase
      .from('withdrawal_codes')
      .delete()
      .in('id', ids);

    if (deleteError) throw deleteError;

    if (process.env.NODE_ENV === 'development') {
      console.log(`Cleaned up ${expiredCodes.length} expired withdrawal codes`);
    }
  } catch (error) {
    console.error('Error cleaning up withdrawal codes:', error);
  }
}

// Add notification for expired codes
export async function notifyExpiredCodes() {
  try {
    const now = new Date().toISOString();
    const { data: expiredCodes, error } = await supabase
      .from('withdrawal_codes')
      .select('*')
      .lte('expires_at', now)
      .eq('notified_expiry', false);

    if (error) throw error;
    if (!expiredCodes || expiredCodes.length === 0) return;

    for (const code of expiredCodes) {
      // Create expiry notification
      const notification = {
        user_id: code.user_id,
        type: 'withdrawal_code_expired',
        title: 'Withdrawal Code Expired',
        message: `Your withdrawal code for $${parseFloat(code.amount).toLocaleString()} has expired. Please request a new code if needed.`,
        status: 'unseen',
        timestamp: now
      };

      batch.set(notificationsRef.doc(), notification);
      batch.update(doc.ref, { notifiedExpiry: true });
    }

    await batch.commit();
  } catch (error) {
    console.error('Error notifying expired codes:', error);
  }
}