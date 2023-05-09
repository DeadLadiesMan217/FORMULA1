const fs = require('fs');
const path_ = require('path');

const axios = require('axios');
const PDFDocument = require('pdfkit');

const logger = require('../log/winston');
const qrCode = require('../utils/QRCode');

const NOTIFICATION_QUEUE = "email_queue";
const NOTIFICATION_QUEUE_EXCHANGE = "notification_exchange";
const NOTIFICATION_QUEUE_BINDING = "sendNotification.email";

let RabbitMQ_data = {
    payload: {},
    RabbitMQ_info: {
        queueName: '',
        exchangeName: '',
        binding_key: ''
    }
};

exports.createQrCode = async (queue_data) => {
    try {
        const { payload, RabbitMQ_info } = RabbitMQ_data;
        const { orderDetails, QRdata, path } = queue_data;
        const { orderId, eventName, eventDate } = orderDetails;
        const { filename, filepath, QRImagePath } = path;

        await qrCode.generate(QRImagePath, QRdata);

        let pdfDoc = new PDFDocument({
            size: [300, 500],
            margins: { top: 10, bottom: 10, left: 10, right: 10 }
        })

        let pdfBackgroundColor = 'black';

        pdfDoc.pipe(fs.createWriteStream(filepath));

        pdfDoc.rect(0, 0, 1000, 1000).fill(pdfBackgroundColor);  // outer-rect
        pdfDoc.roundedRect(25, 25, 250, 450, 5).fill('white');  // inner-rect

        pdfDoc
            .image(path_.join(`${process.env.ROOT_FILE_PATH}`, 'data', 'images', 'formula1.png'), 35, 35, {
                fit: [100, 100],
                align: 'center',
                valign: 'center'
            });  // Logo image

        pdfDoc
            .image(path_.join(`${process.env.ROOT_FILE_PATH}`, 'data', 'images', 'fia-road-safety.png'), 35, 90, {
                fit: [100, 100],
                align: 'center',
                valign: 'center'
            });  // Logo image 2

        pdfDoc
            .fontSize(15)
            .font('Courier-Bold')
            .fill('black')
            .text(eventName, 140, 80, {
                height: 100,
                width: 150
            });  // event-name

        pdfDoc
            .fontSize(10)
            .font('Courier')
            .fill('black')
            .text('Venue Date', 50, 200, {
                height: 10,
                width: 100
            });  // event-date-time-header

        pdfDoc
            .fontSize(22)
            .font('Helvetica-Bold')
            .fill('black')
            .text(eventDate, 50, 220, {
                height: 10,
                width: 100
            });  // event-date-time

        pdfDoc
            .fontSize(10)
            .font('Courier')
            .fill('black')
            .text('Entry Gate', 170, 200, {
                height: 10,
                width: 100
            });  // event-location-header

        pdfDoc
            .fontSize(22)
            .font('Helvetica-Bold')
            .fill('black')
            .text('6D', 170, 220, {
                height: 10,
                width: 100
            });  // event-location

        pdfDoc.circle(26, 190, 10).fill(pdfBackgroundColor);  // left-top
        pdfDoc.circle(26, 250, 10).fill(pdfBackgroundColor);  // left-bottom
        pdfDoc.circle(274, 190, 10).fill(pdfBackgroundColor);  // right-top
        pdfDoc.circle(274, 250, 10).fill(pdfBackgroundColor);  // right-bottom

        pdfDoc.moveTo(37, 190).lineTo(265, 190).dash(2, { space: 3 }).stroke('grey');  // horizontal-dashed
        pdfDoc.moveTo(160, 240).lineTo(160, 195).dash(2, { space: 3 }).stroke('grey');  // vertical-dashed
        pdfDoc.moveTo(37, 250).lineTo(265, 250).dash(2, { space: 3 }).stroke('grey');  // horizontal-dashed

        pdfDoc.image(QRImagePath, 75, 285, { fit: [150, 150], align: 'center', valign: 'center' });  // QR image
        pdfDoc
            .fontSize(10).font('Courier').fill('black').text(orderId, 79, 446, {
                height: 10,
                width: 150,
            });  // QR-code id

        pdfDoc
            .fontSize(7)
            .font('Helvetica')
            .fill('white')
            .text('Formula 1 Company. All rights reserved', 90, 485, {
                height: 10,
                width: 200
            });  // footer

        pdfDoc
            .rotate(270, { origin: [100, 190] })
            .fontSize(7)
            .font('Helvetica-BoldOblique')
            .fill('white').text('***For development purposes only', -10, 100, {
                height: 400,
                width: 450,
                characterSpacing: 1
            });  // side-disclamer

        pdfDoc.end();

        let attachement = {
            filename: filename,
            path: filepath
        };

        Object.assign(payload, {
            emailPayload: {
                to: process.env.TEST_EMAIL,
                subject: `[ ORDER_ID: ${orderDetails.orderId} ] has been created!`,
                html: `
            <h5>Hi ${QRdata.name},</h5>
            <p>Thanks for shopping with us!</p>
            <p>Your order with id '${orderDetails.orderId}' has been placed successfully.</p>
            <p>Please find the invoice attached to your order and enjoy your weekend with us.</p>
            <h5>Thanks and Regards,</h5>
            <h5>FIA</h5>
            `,
                attachement: !attachement ? '' : attachement
            }
        });

        //! send data to rabbitmq in email_queue queue though notification exchange
        RabbitMQ_info.queueName = NOTIFICATION_QUEUE;
        RabbitMQ_info.exchangeName = NOTIFICATION_QUEUE_EXCHANGE;
        RabbitMQ_info.binding_key = NOTIFICATION_QUEUE_BINDING;

        // console.log(RabbitMQ_data);

        await axios.post(process.env.ROOT_URL + '/internal/rabbitmq/send-message', {
            "payload": payload,
            "RabbitMQ_info": RabbitMQ_info
        });

    } catch (err) {
        logger.error(`[Something went wrong in createQr] => ${err}`);
        logger.error(err);
    }
}

