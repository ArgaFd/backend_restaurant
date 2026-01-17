const nodemailer = require('nodemailer');

/**
 * Configure email transporter
 * For development, you can use ethereal.email or a real SMTP service.
 */
const isSmtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS !== 'your_app_password_here'
);

const transporter = isSmtpConfigured
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    })
    : null;

/**
 * Handle Mock Email Sending
 */
const sendMockEmail = (email, resetUrl, error = null) => {
    console.log('\n--- 📧 MOCK EMAIL SENT ---');
    if (error) {
        console.log('Reason: SMTP Error (Falling back to Mock)');
        console.log(`Error: ${error.message}`);
    } else {
        console.log('Reason: SMTP Not Configured');
    }
    console.log(`To: ${email}`);
    console.log(`Subject: Reset Password - ${process.env.APP_NAME || 'POS SO'}`);
    console.log(`Reset Link: ${resetUrl}`);
    console.log('--------------------------\n');
    return { messageId: 'mock-id' };
};

/**
 * Send reset password email
 */
const sendResetPasswordEmail = async (email, resetUrl) => {
    const mailOptions = {
        from: `"${process.env.APP_NAME || 'POS SO'}" <${process.env.SMTP_FROM || 'no-reply@pos-so.com'}>`,
        to: email,
        subject: `Reset Password - ${process.env.APP_NAME || 'POS SO'}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Permintaan Reset Kata Sandi</h2>
        <p>Halo,</p>
        <p>Seseorang telah meminta untuk mereset kata sandi akun ${process.env.APP_NAME || 'POS SO'} Anda. Klik tombol di bawah ini untuk melanjutkan:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Kata Sandi Sekarang</a>
        </div>
        <p>Jika Anda tidak meminta ini, abaikan saja email ini. Tautan ini akan kedaluwarsa dalam 1 jam.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b;">Ini adalah email otomatis, jangan balas email ini.</p>
      </div>
    `,
    };

    try {
        if (!transporter) {
            return sendMockEmail(email, resetUrl);
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Reset email sent to:', email);
        return info;
    } catch (error) {
        // If SMTP fails (e.g. wrong credentials), don't crash the server
        // Instead, log the error and fallback to mock display in terminal
        return sendMockEmail(email, resetUrl, error);
    }
};

module.exports = {
    sendResetPasswordEmail,
};
