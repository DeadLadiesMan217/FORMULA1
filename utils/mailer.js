const nodemailer = require('nodemailer');

const logger = require('../log/winston');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASS
    }
});

module.exports = {
    sendMailToCustomer: async ({ to, subject, html, attachement }) => {
        try {
            await transporter.sendMail({
                to: to,
                from: process.env.EMAIL_ID,
                subject: subject,
                html: html,
                attachments: [attachement]
            });
            logger.info(`Mail email to '${to}'`);
        } catch (err) {
            const error = new Error(err);
            error.httpStatusCode = 500;
            logger.error(`[Error in sending mail to '${to}'] => ${error}`);
        }
    }
};