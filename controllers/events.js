const path = require('path');

const axios = require('axios');

const logger = require('../log/winston');
const User = require('../models/user');
const Order = require('../models/order');
const Event = require('../models/events');

const GET_QR_QUEUE = "get_qr_ticket_queue";
const GET_QR_QUEUE_EXCHANGE = "PDF_exchange";
const GET_QR_QUEUE_BINDING = "createPdfFile.QR";

let RabbitMQ_data = {
    payload: {},
    RabbitMQ_info: {
        queueName: '',
        exchangeName: '',
        binding_key: ''
    }
};

module.exports = {
    getEvents: async (req, res, next) => {
        try {
            const user = await req.user.populate();
            const events = await Event.find();

            res.status(200).json({
                message: "Events fetched!!",
                data: events,
                user: user._id
            });

            logger.info("Events fetched");
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    getCart: async (req, res, next) => {
        try {
            const user = await req.user.populate();
            const products = await user.cart.items;

            res.status(200).json({
                message: "Cart Items",
                data: products
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    postCart: async (req, res, next) => {
        const event_ID = req.body.eventId;

        try {
            const event = await Event.findById(event_ID);

            if (!event) {
                const error = new Error('could not found event to add in cart.');
                error.statusCode = 404;
                throw error;
            }

            await req.user.addToCart(event);

            res.status(201).json({
                message: "Event added to Cart."
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    deleteCartProduct: async (req, res, next) => {
        //const event_ID = req.body.eventId;
        try {
            // await req.user.removeFromCart(event_ID);
            await req.user.clearCart();

            res.status(201).json({
                message: "Item deleted from cart."
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    getOrders: async (req, res, next) => {
        try {
            const orders = await Order.find({ "user.userId": req.user._id });

            res.status(200).json({
                message: "Orders",
                data: orders
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    createOrder: async (req, res, next) => {
        try {
            const user = await req.user.populate('cart.items.eventId');

            if (user.cart.items.length == 0) {
                const error = new Error('no cart items found.');
                error.statusCode = 404;
                throw error;
            }

            const products = user.cart.items.map(i => {
                return {
                    quantity: i.quantity,
                    product: { ...i.eventId._doc }
                }
            });

            const order = new Order({
                user: {
                    userId: req.user
                },
                products: products
            });

            await order.save();
            await req.user.clearCart();

            res.status(201).json({
                message: "Order placed.",
                data: {
                    orderId: order.id
                }
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    getInvoice: async (req, res, next) => {
        try {
            const id = req.params.orderId;
            const order = await Order.findOne({ _id: id });

            console.log(order)

            if (!order) {
                const error = new Error('no Order found!');
                error.statusCode = 401;
                throw error;
            }



            const QRdata = JSON.stringify({
                name: req.user.name,
                userId: req.user.email,
                ticketId: order._id
            });

            console.log(QRdata)

            const invoiceName = 'invoice-' + order._id + '.pdf';
            const invoicePath = path.join('data', 'invoices', invoiceName);


            //! send data to rabbitmq in create_invoice queue
            const RabbitMQ_data = {
                invoice_data: {
                    invoiceName,
                    invoicePath
                }
            };

            console.log(RabbitMQ_data)

            res.status(201).json({
                message: `Data send'`
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    },

    getQrTicket: async (req, res, next) => {
        try {
            const { payload, RabbitMQ_info } = RabbitMQ_data;

            const id = req.params.ticketId;
            const order = await Order.findOne({ _id: id });

            if (!order) {
                const error = new Error('no Order for this ticketId was found!');
                error.statusCode = 401;
                throw error;
            }

            const filename = 'QR-' + order._id + '.pdf';
            const filepath = path.join(`.${process.env.ROOT_FILE_PATH}`, 'data', 'QR_file', filename);

            const QRImageName = 'QR-' + order._id + '.png';
            const QRImagePath = path.join(`.${process.env.ROOT_FILE_PATH}`, 'data', 'images', QRImageName);

            const product = await Event.findOne({ _id: order.products[0].product });

            if (!product) {
                const error = new Error('no product with this ticketId was found!');
                error.statusCode = 401;
                throw error;
            }

            Object.assign(payload, {
                orderDetails: {
                    orderId: order._id,
                    eventName: product.eventName,
                    eventDate: product.eventDate
                },
                QRdata: {
                    name: req.user.name,
                    userId: req.user.email,
                    ticketId: order._id
                },
                path: {
                    filename: filename,
                    filepath: filepath,
                    QRImagePath: QRImagePath,
                }
            });

            //! send data to rabbitmq in create_QR queue
            RabbitMQ_info.queueName = GET_QR_QUEUE;
            RabbitMQ_info.exchangeName = GET_QR_QUEUE_EXCHANGE;
            RabbitMQ_info.binding_key = GET_QR_QUEUE_BINDING;

            await axios.post(process.env.ROOT_URL + '/internal/rabbitmq/send-message', {
                "payload": payload,
                "RabbitMQ_info": RabbitMQ_info
            });

            res.status(201).json({
                statusCode: 200,
                message: `Data send to queue`
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    }
};