module.exports = (req, res, next) => {
    if (!req.isAdmin) {
        const error = new Error('Not An Authorized Admin User.');
        error.statusCode = 401;
        throw error;
    }
    next();
};