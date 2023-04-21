const amqplib = require('amqplib');

const createQr = require('../helpers/createQR');
const Notification = require('../helpers/notification');

class RabbitMQ {
    constructor() {

    }

    async sendMsg(rawData) {
        try {
            let { payload, RabbitMQ_info } = rawData;
            let { queueName, exchangeName, binding_key } = RabbitMQ_info;

            const connection = await amqplib.connect(process.env.AMQL_CONNECTION_URL);
            const channel = await connection.createChannel();

            await channel.assertExchange(exchangeName, 'direct', {
                durable: true,
            });

            await channel.assertQueue(queueName);

            channel.bindQueue(queueName, exchangeName, binding_key);
            channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)));
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            throw (err, '[something went wrong in publishing message in rabbitmq queue]');
        }
    };

    async consumeMsg(queueArray) {
        try {
            queueArray.forEach(async (queueName) => {
                const connection = await amqplib.connect(process.env.AMQL_CONNECTION_URL);
                const channel = await connection.createChannel();
                await channel.assertQueue(queueName);

                channel.consume(queueName, msg => {
                    if (queueName == 'get_qr_ticket_queue') {
                        createQr.createQrCode(JSON.parse(msg.content.toString()));
                    }
                    if (queueName == 'email_queue') {
                        Notification.sendEmail(JSON.parse(msg.content.toString()));
                    }
                }, {
                    // noAck: false, //!true
                    noAck: true,
                    consumerTag: `${queueName}_tag`
                });
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            throw (err);
        }
    };
};

module.exports = new RabbitMQ();