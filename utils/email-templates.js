/**
 * Email templates for various notifications
 */
const config = require('../config');

/**
 * Generate email verification template
 * 
 * @param {Object} options
 * @param {string} options.fullName - User's full name
 * @param {string} options.verificationUrl - URL to verify email
 * @returns {Object} - Email template with subject, text and HTML
 */
exports.emailVerification = (options) => {
    const { fullName, verificationUrl } = options;
    const appName = config.smtp.fromName || 'Food Hub';
    
    // Plain text version
    const text = `
Hello ${fullName},

Thank you for registering with ${appName}!

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you did not register with us, please ignore this email.

Best regards,
The ${appName} Team
    `;
    
    // HTML version
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
        }
        .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${appName}</div>
        </div>
        
        <h2>Verify Your Email Address</h2>
        
        <p>Hello ${fullName},</p>
        
        <p>Thank you for registering with ${appName}! To complete your registration, please verify your email address.</p>
        
        <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email</a>
        </div>
        
        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        
        <p>This link will expire in 24 hours.</p>
        
        <p>If you did not register with us, please ignore this email.</p>
        
        <p>Best regards,<br>The ${appName} Team</p>
    </div>
    <div class="footer">
        &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
    </div>
</body>
</html>
    `;
    
    return {
        subject: `Verify Your Email - ${appName}`,
        text,
        html
    };
};

/**
 * Generate email verification success template
 * 
 * @param {Object} options
 * @param {string} options.fullName - User's full name
 * @param {string} options.loginUrl - URL to login page
 * @returns {Object} - Email template with subject, text and HTML
 */
exports.emailVerificationSuccess = (options) => {
    const { fullName, loginUrl } = options;
    const appName = config.smtp.fromName || 'Food Hub';
    
    // Plain text version
    const text = `
Hello ${fullName},

Your email has been successfully verified!

You can now log in to your account using the link below:

${loginUrl}

Thank you for joining ${appName}. We're excited to have you with us!

Best regards,
The ${appName} Team
    `;
    
    // HTML version
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
        }
        .success-icon {
            text-align: center;
            font-size: 48px;
            color: #4CAF50;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${appName}</div>
        </div>
        
        <div class="success-icon">✓</div>
        
        <h2>Email Verification Successful!</h2>
        
        <p>Hello ${fullName},</p>
        
        <p>Your email has been successfully verified!</p>
        
        <p>You can now log in to your account and start using all the features of ${appName}.</p>
        
        <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Log In</a>
        </div>
        
        <p>Thank you for joining ${appName}. We're excited to have you with us!</p>
        
        <p>Best regards,<br>The ${appName} Team</p>
    </div>
    <div class="footer">
        &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
    </div>
</body>
</html>
    `;
    
    return {
        subject: `Email Verified Successfully - ${appName}`,
        text,
        html
    };
};