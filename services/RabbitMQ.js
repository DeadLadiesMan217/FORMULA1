const amqplib = require('amqplib');

const logger = require('../log/winston');
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
            channel.publish(exchangeName, binding_key, Buffer.from(JSON.stringify(payload)));

            logger.info(`[Message send to '${queueName}' queue] msg => ` + JSON.stringify(rawData));

            setTimeout(() => {
                connection.close();
            }, 20000);
        } catch (err) {
            logger.error(err);
            logger.error('\n [something went wrong while publishing message in rabbitmq queue] \n');
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
            logger.error(err);
            logger.error('\n [something went wrong connecting to rabbitmq consumers] \n');
        }
    };
};

module.exports = new RabbitMQ();