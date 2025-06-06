import nodemailer from 'nodemailer';

interface SendVerificationEmailOptions {
  to: string;
  verificationCode: string;
  studentName: string;
}

// Create reusable transporter object using SMTP transport
const createTransport = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email configuration missing. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.');
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendVerificationEmail = async ({ to, verificationCode, studentName }: SendVerificationEmailOptions) => {
  try {
    const transporter = createTransport();

    const mailOptions = {
      from: `"TypeManipal" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Verify your Manipal Email - TypeManipal Leaderboard',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              background-color: #000000; 
              color: #ffffff; 
              margin: 0; 
              padding: 20px; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #111111; 
              border-radius: 12px; 
              padding: 40px; 
              border: 1px solid #333333; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
            }
            .logo { 
              color: #4F46E5; 
              font-size: 28px; 
              font-weight: bold; 
              margin-bottom: 10px; 
            }
            .title { 
              color: #ffffff; 
              font-size: 24px; 
              margin-bottom: 10px; 
            }
            .subtitle { 
              color: #888888; 
              font-size: 16px; 
            }
            .verification-code { 
              background-color: #1F2937; 
              border: 2px solid #4F46E5; 
              border-radius: 8px; 
              padding: 20px; 
              text-align: center; 
              margin: 30px 0; 
            }
            .code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #4F46E5; 
              letter-spacing: 4px; 
              font-family: 'Courier New', monospace; 
            }
            .instructions { 
              color: #CCCCCC; 
              line-height: 1.6; 
              margin: 20px 0; 
            }
            .warning { 
              background-color: #1F1F1F; 
              border-left: 4px solid #EF4444; 
              padding: 15px; 
              margin: 20px 0; 
              color: #FCA5A5; 
            }
            .footer { 
              text-align: center; 
              color: #666666; 
              font-size: 14px; 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #333333; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚡ TypeManipal</div>
              <h1 class="title">Email Verification</h1>
              <p class="subtitle">Hi ${studentName}! Verify your Manipal email to get the verified badge.</p>
            </div>
            
            <div class="verification-code">
              <div class="code">${verificationCode}</div>
            </div>
            
            <div class="instructions">
              <p><strong>Here's your verification code!</strong></p>
              <p>Enter this 6-digit code in your dashboard to verify your Manipal email address and earn the verified badge on the leaderboard.</p>
              <p><strong>This code will expire in 10 minutes.</strong></p>
            </div>
            
            <div class="warning">
              <strong>Security Note:</strong> This code was requested for email verification on TypeManipal. If you didn't request this, please ignore this email.
            </div>
            
            <div class="footer">
              <p>This email was sent to verify your Manipal email address.</p>
              <p>TypeManipal Leaderboard - Compete with your fellow Manipalites!</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        TypeManipal - Email Verification
        
        Hi ${studentName}!
        
        Your verification code is: ${verificationCode}
        
        Enter this code in your dashboard to verify your Manipal email address and earn the verified badge.
        
        This code will expire in 10 minutes.
        
        If you didn't request this verification, please ignore this email.
        
        TypeManipal Leaderboard
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const generateVerificationCode = (): string => {
  return Math.random().toString().substr(2, 6);
}; 