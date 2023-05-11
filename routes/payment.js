const express = require('express');

const router = express.Router();

const payment = require('../controllers/payment');

router.get('/checkout', payment.getCheckout);

router.get('/checkout/success', payment.getCheckoutSuccess);

router.get('/checkout/cancel', payment.getCheckoutCancel);

router.post('/v1/actions', express.raw({type: 'application/json'}), payment.stipeWebHook);

module.exports = router;