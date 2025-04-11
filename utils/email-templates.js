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
/**
 * Generate password reset email template
 * 
 * @param {Object} options
 * @param {string} options.fullName - User's full name
 * @param {string} options.resetUrl - URL to reset password
 * @returns {Object} - Email template with subject, text and HTML
 */
exports.passwordReset = (options) => {
    const { fullName, resetUrl } = options;
    const appName = config.smtp.fromName || 'Food Hub';
    
    // Extract the token from the resetUrl
    const token = resetUrl.split('/').pop();
    
    // Create the frontend URL
    const clientUrl = config.clientUrl || 'http://localhost:4200';
    const frontendResetUrl = `${clientUrl}/auth/reset-password/${token}`;
    
    // Plain text version
    const text = `
Hello ${fullName},

You are receiving this email because you (or someone else) has requested to reset your password.

Please click on the following link or paste it into your browser to complete the process:

${frontendResetUrl}

This link will be valid for only 1 hour.

If you did not request this, please ignore this email and your password will remain unchanged.

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
            color: white !important;
            padding: 12px 25px;
            text-decoration: none !important;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
            cursor: pointer;
        }
        .alert {
            padding: 10px;
            background-color: #fff8e1;
            border-left: 4px solid #ffc107;
            margin: 15px 0;
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
        
        <h2>Password Reset Request</h2>
        
        <p>Hello ${fullName},</p>
        
        <p>You are receiving this email because you (or someone else) has requested to reset your password.</p>
        
        <div style="text-align: center;">
            <a href="${frontendResetUrl}" class="button" style="color: white !important; text-decoration: none !important; background-color: #4CAF50; display: inline-block; padding: 12px 25px; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        
        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${frontendResetUrl}">${frontendResetUrl}</a></p>
        
        <div class="alert">
            <strong>Note:</strong> This link will be valid for only 1 hour.
        </div>
        
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        
        <p>Best regards,<br>The ${appName} Team</p>
    </div>
    <div class="footer">
        &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
    </div>
</body>
</html>
    `;
    
    return {
        subject: `Reset Your Password - ${appName}`,
        text,
        html
    };
};
/**
 * Generate password reset success template
 * 
 * @param {Object} options
 * @param {string} options.fullName - User's full name
 * @param {string} options.loginUrl - URL to login page
 * @returns {Object} - Email template with subject, text and HTML
 */
exports.passwordResetSuccess = (options) => {
    const { fullName, loginUrl } = options;
    const appName = config.smtp.fromName || 'Food Hub';
    
    // Plain text version
    const text = `
Hello ${fullName},

Your password has been successfully reset.

You can now log in to your account using your new password:

${loginUrl}

If you did not make this change, please contact our support team immediately.

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
        
        <h2>Password Reset Successful!</h2>
        
        <p>Hello ${fullName},</p>
        
        <p>Your password has been successfully reset.</p>
        
        <p>You can now log in to your account using your new password:</p>
        
        <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Log In Now</a>
        </div>
        
        <p>If you did not make this change, please contact our support team immediately.</p>
        
        <p>Best regards,<br>The ${appName} Team</p>
    </div>
    <div class="footer">
        &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
    </div>
</body>
</html>
    `;
    
    return {
        subject: `Password Reset Successful - ${appName}`,
        text,
        html
    };
};