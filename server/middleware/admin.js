const User = require('../models/User')

// Verify the role from the database so role changes take effect immediately.
const verifyAdminJWT = async (req, res, next) => {
    if (!req.user?._id) {
        return res.status(401).json({ message: 'Unauthorized - No user found' })
    }

    try {
        const user = await User.findById(req.user._id).select('role').lean()
        if (!user) return res.status(401).json({ message: 'Unauthorized - User not found' })
        if (user.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden - Admin access required' })
        }

        req.user.role = user.role
        return next()
    } catch (error) {
        return next(error)
    }
}

module.exports = verifyAdminJWT
