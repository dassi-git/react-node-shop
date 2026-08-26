const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyJWT = async (req, res, next) => {
    const authHeader = req.get('authorization');
    const [scheme, token] = authHeader?.trim().split(/\s+/, 2) || [];

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    if (!process.env.ACCESS_TOKEN_SECRET) {
        return next(new Error('ACCESS_TOKEN_SECRET is not configured'));
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
            algorithms: ['HS256']
        });

        const user = await User.findById(decoded._id).select('_id name email userName role').lean();
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized - User not found' });
        }

        req.user = user;
        return next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ message: 'Forbidden - Invalid or expired token' });
        }
        return next(error);
    }
};

module.exports = verifyJWT;
