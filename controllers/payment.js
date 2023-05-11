const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const logger = require('../log/winston');

exports.getCheckout = async (req, res, next) => {
    try {
        const sessionID = await stripe.checkout.sessions.create({
            line_items: [{
                price_data: {
                    currency: 'inr',
                    unit_amount: 20 * 100,
                    product_data: {
                        name: 'T-shirt',
                        description: 'Comfortable cotton t-shirt',
                    },
                },
                quantity: 1,
            }],
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
};

exports.getCheckoutSuccess = async (req, res, next) => {
    try {
        logger.info("payment succed");

        res.redirect('https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Bundesstra%C3%9Fe_200_number.svg/1200px-Bundesstra%C3%9Fe_200_number.svg.png');
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getCheckoutCancel = async (req, res, next) => {
    try {
        res.status(500).json({
            message: 'Payment Failed'
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.stipeWebHook = async (req, res, next) => {
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body.rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET_KEY);

        res.send();

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
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
            console.log(`Unhandled event type ${event.type}`);
    }
};