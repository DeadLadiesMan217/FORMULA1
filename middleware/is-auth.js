const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    let decodedToken;
    const authHeader = req.get('Authorization');

    if (!authHeader) {
        const error = new Error('Not Authenticated.');
        error.statusCode = 401;
        throw error;
    }

    const token = authHeader.split(' ')[1];
    
    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET_TOKEN);
    } catch (err) {
        err.statusCode = 500;
        throw err;
    }

    if (!decodedToken) {
        const error = new Error('Not Authenticated.');
        error.statusCode = 401;
        throw error;
    }

    req.user = decodedToken.userId;
    req.isAdmin = decodedToken.isAdmin;
    
    next(); 
};