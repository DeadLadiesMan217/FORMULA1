const RabbitMqService = require('../services/RabbitMQ');

exports.sendMesaage = async (req, res, next) => {
    try {
        const payload = req.body.payload;
        const RabbitMQ_info = req.body.RabbitMQ_info;

        const RabbitMQ_data = {
            payload,
            RabbitMQ_info
        };

        RabbitMqService.sendMsg(RabbitMQ_data);
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};