// server/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        // Verify transporter connection
        this.transporter.verify((error) => {
            if (error) {
                console.error('❌ Gmail connection failed:', error);
            } else {
                console.log('✅ Gmail email service initialized');
            }
        });
    }

    async sendPasswordReset(email, resetLink, userName = 'User') {
        try {
            const mailOptions = {
                from: `"AI Interview Coach" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: 'Reset Your Password - AI Interview Coach',
                html: this.getPasswordResetTemplate(userName, resetLink, email),
                text: `Hi ${userName}, reset your password using this link: ${resetLink}`
            };

            const info = await this.transporter.sendMail(mailOptions);

            console.log(`✅ Password reset email sent to: ${email}`);
            
            // Preview URL (useful if using Ethereal for dev)
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log('🔍 Preview URL:', previewUrl);

            return { success: true, messageId: info.messageId, previewUrl: previewUrl || null };
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    getPasswordResetTemplate(userName, resetLink, email) {
        return `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px;">
            <div style="max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:8px;">
                <h2 style="color:#333;">Reset Your Password</h2>
                <p>Hi <strong>${userName}</strong>,</p>
                <p>We received a request to reset your password for your AI Interview Coach account. Click the button below to proceed:</p>
                <p style="text-align:center;">
                    <a href="${resetLink}" 
                       style="background:#667eea;color:#fff;padding:12px 25px;
                              text-decoration:none;border-radius:5px;font-weight:bold;">
                        Reset My Password
                    </a>
                </p>
                <p style="color:#555;">If you didn’t request this, you can safely ignore this email. Your account is secure.</p>
                <p style="color:#555;">This link will expire in <strong>1 hour</strong>.</p>
                <hr style="border:none;border-top:1px solid #ddd;"/>
                <p style="font-size:12px;color:#777;text-align:center;">
                    You are receiving this email because a password reset was requested for your account: <strong>${email}</strong>.
                </p>
                <p style="font-size:12px;color:#777;text-align:center;">
                    © ${new Date().getFullYear()} AI Interview Coach. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = new EmailService();
