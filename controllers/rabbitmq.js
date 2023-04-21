const RabbitMqService = require('../services/RabbitMQ');

exports.sendMesaage = async (req, res, next) => {
    const payload = req.body.payload;
    const RabbitMQ_info = req.body.RabbitMQ_info;

    const RabbitMQ_data = {
        payload,
        RabbitMQ_info
    };

    console.log(RabbitMQ_data, "[success new route]")
    
    RabbitMqService.sendMsg(RabbitMQ_data);
};