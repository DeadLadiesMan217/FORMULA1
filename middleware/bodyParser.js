// only use the raw bodyParser for webhooks
const bodyParser = require('body-parser');

module.exports = (req, res, next) => {
    if (req.originalUrl === '/internal/payments/v1/actions') {
        next();
    } else {
        bodyParser.json()(req, res, next);
    }
};