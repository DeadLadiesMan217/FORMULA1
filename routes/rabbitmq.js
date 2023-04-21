const express = require('express');

const router = express.Router();

const RabbitMqController = require('../controllers/rabbitmq');

router.post('/send-message', RabbitMqController.sendMesaage);

module.exports = router;