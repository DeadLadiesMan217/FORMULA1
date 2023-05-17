const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const User = require('../models/user');
const Order = require('../models/order');
const logger = require('../log/winston');

module.exports = {
    getCheckout: async (req, res, next) => {
        try {
            const user = await req.user.populate('cart.items.eventId');
            const product = user.cart.items;

            const sessionID = await stripe.checkout.sessions.create({
                line_items: product.map(p => {
                    return {
                        price_data: {
                            currency: 'inr',
                            unit_amount: 20 * 100,
                            product_data: {
                                name: p.eventId.eventName,
                                description: p.eventId.eventLocation + ' ' + p.eventId.eventDate,
                            },
                        },
                        quantity: p.quantity,
                    }
                }),
                mode: 'payment',
                payment_method_types: ['card'],
                success_url: req.protocol + '://' + req.get('host') + '/internal/payments/checkout/success',
                cancel_url: req.protocol + '://' + req.get('host') + '/internal/payments/checkout/cancel'
            });

            res.status(200).json({
                message: "Payment session created",
                checkout_url: sessionID.url
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    getCheckoutSuccess: async (req, res, next) => {
        try {
            logger.info("payment succed");
            
            const order = await axios.post(req.protocol + '://' + req.get('host') + 'events/create-order');
            

        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    getCheckoutCancel: async (req, res, next) => {
        try {
            res.status(424).json({
                message: 'Payment Failed'
            })
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    stipeWebHook: async (req, res, next) => {
        let event = req.body;

        if (process.env.STRIPE_WEBHOOK_SECRET_KEY) {
            try {
                event = stripe.webhooks.constructEvent(
                    req.body,
                    req.headers['stripe-signature'],
                    process.env.STRIPE_WEBHOOK_SECRET_KEY
                );

                res.status(200).json({
                    message: "Success"
                });
            } catch (err) {
                logger.error(('[Webhook signature verification failed] => Error', err));
                if (!err.statusCode) {
                    err.statusCode = 500;
                }
                next(err);
            }
        }

        switch (event.type) {
            case 'checkout.session.async_payment_failed':
                const checkoutSessionAsyncPaymentFailed = event.data.object;
                logger.info(checkoutSessionAsyncPaymentFailed);
                break;

            case 'checkout.session.async_payment_succeeded':
                const checkoutSessionAsyncPaymentSucceeded = event.data.object;
                logger.info(checkoutSessionAsyncPaymentSucceeded);
                break;

            case 'checkout.session.completed':
                const checkoutSessionCompleted = event.data.object;
                logger.info(checkoutSessionCompleted);
                break;

            case 'checkout.session.expired':
                const checkoutSessionExpired = event.data.object;
                logger.info(checkoutSessionExpired);
                break;

            default:
                logger.warn(`[Unhandled stripe event type] => ${event.type}`);
        }
    }
};