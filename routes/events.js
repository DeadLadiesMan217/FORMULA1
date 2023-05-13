const express = require('express');

const router = express.Router();

const isAuth = require('../middleware/is-auth');
const eventsControlller = require('../controllers/events');

router.get('/', eventsControlller.getEvents);

router.get('/cart', isAuth, eventsControlller.getCart);

router.post('/cart', isAuth, eventsControlller.postCart);

router.delete('/cart-delete-item', isAuth, eventsControlller.deleteCartProduct);

router.post('/create-order', isAuth, eventsControlller.createOrder);

router.get('/orders', isAuth, eventsControlller.getOrders);

// router.get('/orders/:orderId', isAuth, eventsControlller.getInvoice);

router.get('/order/QR_ticket/:ticketId', isAuth, eventsControlller.getQrTicket);

module.exports = router;