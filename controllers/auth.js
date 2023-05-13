const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const User = require('../models/user');
const logger = require('../log/winston');

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

let { payload, RabbitMQ_info } = RabbitMQ_data;

exports.signup = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const error = new Error('Validation Failed');
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        const email = req.body.email;
        const password = req.body.password;
        const name = req.body.name;

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new User({
            email: email,
            password: hashedPassword,
            name: name
        });

        const user_id = await user.save();

        const result = {
            message: 'User created successfully!',
            userId: user_id
        };

        logger.info(`[new user created] => ${JSON.stringify(result)}`);

        RabbitMQ_info.queueName = NOTIFICATION_QUEUE;
        RabbitMQ_info.exchangeName = NOTIFICATION_QUEUE_EXCHANGE;
        RabbitMQ_info.binding_key = NOTIFICATION_QUEUE_BINDING;

        Object.assign(payload, {
            emailPayload: {
                to: process.env.TEST_EMAIL,
                subject: `Welcome to F1 (Testing) APP`,
                html: `
            <h5>Hi ${name},</h5>
            <p>Formula 1 (Testing) warmly welcomes you.</p>
            <p>Feel free to explore our app and book your wonderful weekend at your ease.</p>
            <h5>Thanks and Regards,</h5>
            <h5>FIA</h5>
            `
            }
        });

        await axios.post(req.protocol + '://' + req.get('host') + '/internal/rabbitmq/send-message', {
            "payload": payload,
            "RabbitMQ_info": RabbitMQ_info
        });

        res.status(201).json(result);

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const loadedUser = await User.findOne({ email: email });

        if (!loadedUser) {
            const error = new Error('A user with this email could not be found.');
            error.statusCode = 401;
            throw error;
        }

        const isEqualPassword = await bcrypt.compare(password, loadedUser.password);

        if (!isEqualPassword) {
            const error = new Error('Wrong Password.');
            error.statusCode = 401;
            throw error;
        }

        const token = jwt.sign({
            email: loadedUser.email,
            userId: loadedUser._id.toString(),
            isAdmin: loadedUser.isAdmin
        }, process.env.JWT_SECRET_TOKEN,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            token: token,
            userId: loadedUser._id.toString()
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};