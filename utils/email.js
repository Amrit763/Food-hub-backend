const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {String} options.email - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.message - Email message (text)
 * @param {String} options.html - Email HTML (optional)
 */
const sendEmail = async (options) => {
    // Create transporter
    const transporter = nodemailer.createTransport({
        service: config.email.service,
        auth: {
            user: config.email.user,
            pass: config.email.password
        }
    });

    // Define email options
    const mailOptions = {
        from: `FoodHub <${config.email.user}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    // Send email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;