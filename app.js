const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const CronJob = require('cron').CronJob;

const logger = require('./log/winston');

const eventRoute = require('./routes/events');
const adminRoute = require('./routes/admin');
const rabbitmqRoute = require('./routes/rabbitmq');
const paymentRoute = require('./routes/payment');
const User = require('./models/user');
const RabbitMqService = require('./services/RabbitMQ');

const queueArray = ['get_qr_ticket_queue', 'email_queue'];

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.qvv5l.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`;
logger.info(process.env.NODE_ENV);

const app = express();

// app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use((req, res, next) => {
    User.findById("62a8330c98456e8cba648ed5")
        .then(user => {
            req.user = user;
            next();
        })
        .catch(err => {
            logger.error(err);
        })
});

app.use('/events', eventRoute);
app.use('/admin', adminRoute);
app.use('/internal/rabbitmq', rabbitmqRoute);
app.use('/internal/payments', paymentRoute);

app.use((error, req, res, next) => {
    logger.error(error);
    const status = error.statusCode || 500;
    const message = error.message || 'Something went wrong!';
    const data = error.data;
    res.status(status).json({ status: status, message: message, data: data });
});

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        User.findOne()
            .then(user => {
                if (!user) {
                    const user = new User({
                        name: 'raj',
                        email: 'raj@raj.com',
                        cart: {
                            items: []
                        }
                    })
                    user.save()
                }
            })
        app.listen(process.env.PORT || 8888);
        logger.info("MONGODB Connected!!!");
    })
    .then(() => {
        RabbitMqService.consumeMsg(queueArray);
        logger.info("RabbitMQ consumers connected!!!");
    })
    .then(() => {
        let dir1 = `${process.env.ROOT_FILE_PATH}/data/images`;
        let dir2 = `${process.env.ROOT_FILE_PATH}/data/invoices`;
        let dir3 = `${process.env.ROOT_FILE_PATH}/data/QR_file`;

        for (let i of [dir1, dir2, dir3]) {
            if (!fs.existsSync(i)) {
                fs.mkdirSync(path.join(i), { recursive: true });
            }
        }

        logger.info("Volume Synchronize!!!");
    })
    .catch(err => {
        logger.error(err);
    });