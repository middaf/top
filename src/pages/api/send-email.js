// API endpoint for sending email notifications
// Using a simple email service - in production, use SendGrid, Mailgun, etc.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, message, type } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, message' });
    }

    // For now, we'll log the email and simulate sending
    // In production, integrate with an email service like SendGrid
    console.log('📧 Email Notification:', {
      to,
      subject,
      message,
      type,
      timestamp: new Date().toISOString()
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // TODO: Integrate with actual email service
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: to,
      from: 'noreply@topmintinvest.com',
      subject: subject,
      html: message,
    };

    await sgMail.send(msg);
    */

    res.status(200).json({
      success: true,
      message: 'Email notification sent successfully'
    });

  } catch (error) {
    console.error('Email notification error:', error);
    res.status(500).json({
      error: 'Failed to send email notification',
      details: error.message
    });
  }
}