const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Send an email using SMTP
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Plain text email body
 * @param {string} [options.html] - HTML email body (optional)
 */
const sendEmail = async (options) => {
    try {
        // Log SMTP configuration (without showing full password)
        console.log('Email sending attempt with the following configuration:');
        console.log(`SMTP Host: ${config.smtp.host}`);
        console.log(`SMTP Port: ${config.smtp.port}`);
        console.log(`SMTP Secure: ${config.smtp.secure}`);
        console.log(`SMTP Username: ${config.smtp.username}`);
        console.log(`SMTP Password set: ${config.smtp.password ? 'Yes' : 'No'}`);
        console.log(`From Name: ${config.smtp.fromName}`);
        console.log(`From Email: ${config.smtp.fromEmail}`);
        console.log(`Sending to: ${options.email}`);
        console.log(`Subject: ${options.subject}`);

        // Create a transporter using SMTP
        const transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure, // Use TLS
            auth: {
                user: config.smtp.username,
                pass: config.smtp.password
            },
            debug: true, // Enable debug output
            logger: true // Log information to the console
        });

        // Verify SMTP connection configuration
        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('SMTP connection verified successfully');

        // Generate HTML version if not provided
        let htmlContent = options.html;
        if (!htmlContent && options.message) {
            // Simple conversion of plain text to HTML with nicer formatting
            htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            line-height: 1.6;
                            color: #333;
                            padding: 20px;
                            max-width: 600px;
                            margin: 0 auto;
                        }
                        .container {
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .button {
                            display: inline-block;
                            background-color: #4CAF50;
                            color: white;
                            padding: 10px 20px;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
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
                        <h2>${options.subject}</h2>
                        ${options.message.replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>')}
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} Food Hub. All rights reserved.
                    </div>
                </body>
                </html>
            `;
        }

        // Email options
        const mailOptions = {
            from: `${config.smtp.fromName} <${config.smtp.fromEmail}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: htmlContent || undefined
        };

        console.log('Preparing to send email with following options:');
        console.log(`From: ${mailOptions.from}`);
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        return info;
    } catch (error) {
        console.error('ERROR SENDING EMAIL:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.code) {
            console.error('Error code:', error.code);
        }
        
        if (error.command) {
            console.error('Failed command:', error.command);
        }
        
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

module.exports = sendEmail;