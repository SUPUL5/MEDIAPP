require('dotenv').config();
const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.APP_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        };

        console.log('Sending email to:', to);
        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent: ', result.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email: ', error);
        
        // Improved error handling
        if (error.code === 'EAUTH') {
            console.error('Authentication failed - check your email and app password');
        }
        
        return false;
    }
};

module.exports = { sendEmail };