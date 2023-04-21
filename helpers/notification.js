const mailer = require('../utils/mailer');

class Notification {
    // constructor(msg) {
    //     this.msg = msg;
    // }

    sendEmail(msg) {
        mailer.sendMailToCustomer(msg.emailPayload);
    }

    sendPopUpNotification() { }
};

module.exports = new Notification();