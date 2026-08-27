const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const mongoose = require('mongoose')
const User = require("../models/User")
const PasswordReset = require("../models/PasswordReset")
const { sendPasswordResetEmail } = require("../config/emailService")

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex')
const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const normalizeUserName = (userName) => String(userName || '').trim()
const csrfCookieOptions = {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
}
const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
}


const register = async (req, res) => {
    const { name, userName, address, phone, email, password } = req.body
    const normalizedEmail = normalizeEmail(email)
    const normalizedUserName = normalizeUserName(userName)
    
    if (!name || !userName || !address || !phone || !email || !password)
        return res.status(400).json({ message: 'All fields are required' })
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' })
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' })
    }
    
    const userExist = await User.findOne({ userName: normalizedUserName }).lean()
    if (userExist)
        return res.status(409).json({ message: "Duplicate username" })
    
    const emailExist = await User.findOne({ email: normalizedEmail }).lean()
    if (emailExist)
        return res.status(409).json({ message: "Email already exists" })
    
    try {
        const bcryptPassword = await bcrypt.hash(password, 10)
        const userObj = { name: String(name).trim(), userName: normalizedUserName, address: String(address).trim(), phone: String(phone).trim(), email: normalizedEmail, password: bcryptPassword}
        const user = await User.create(userObj)
        if (user) {
            return res.status(201).json({ message: `New user ${user.userName} created` })
        } else {
            return res.status(400).json({ message: 'Invalid user received' })
        }
    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern.email) {
                return res.status(409).json({ message: 'Email already exists' })
            } else if (error.keyPattern.userName) {
                return res.status(409).json({ message: 'Username already exists' })
            } else {
                return res.status(409).json({ message: 'Duplicate data found' })
            }
        }
        console.error('Registration error:', error)
        return res.status(500).json({ message: 'Server error during registration' })
    }
}

const login = async (req, res) => {
    try {
        const { userName, password } = req.body
        const normalizedUserName = normalizeUserName(userName)
        if (!userName || !password)
            return res.status(400).json({ message: 'All fields are required' })
        const foundUser = await User.findOne({ userName: normalizedUserName }).lean()
        if (!foundUser) {
            return res.status(401).json({ message: 'Unauthorized' })

        }
        const okPassword = await bcrypt.compare(password, foundUser.password)
        if (!okPassword) return res.status(401).json({ message: 'Unauthorized' })


        const userInfo = { _id: foundUser._id.toString(), name: foundUser.name, email: foundUser.email, userName: foundUser.userName, role: foundUser.role }
        const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' })
        const csrfToken = crypto.randomBytes(32).toString('hex')
        res.cookie('accessToken', token, authCookieOptions)
        res.cookie('csrfToken', csrfToken, csrfCookieOptions)
        res.json({ user: userInfo })
    } catch (error) {
        console.error('Login error:', error)
        return res.status(500).json({ message: 'Server error during login' })
    }
}


const getAllUser = async (req, res) => {
    try {
        const users = await User.find().select('-password').lean()
        if (!users?.length) {
            return res.status(400).json({ message: 'No users found' })
        }
        return res.json(users)
    } catch (error) {
        console.error('Error fetching users:', error)
        return res.status(500).json({ message: 'Server error fetching users' })
    }
}

const getUserById = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }
        if (req.user?.role !== 'Admin' && req.user?._id?.toString() !== id.toString()) {
            return res.status(403).json({ message: 'You can only view your own profile' })
        }
        const user = await User.findById(id).select('-password').lean()
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        return res.json(user)
    } catch (error) {
        console.error('Error fetching user by ID:', error)
        return res.status(500).json({ message: 'Server error fetching user' })
    }
}

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }
        const user = await User.findById(id)
        if (!user) {
            return res.status(400).json({ message: 'User not found' })
        }
        await user.deleteOne()
        return res.json({ message: `User ${user.userName} deleted` })
    } catch (error) {
        console.error('Error deleting user:', error)
        return res.status(500).json({ message: 'Server error deleting user' })
    }
}

const updateUser = async (req, res) => {
    try {
        const { id } = req.params
        const { name, userName, address, phone, email, password, role } = req.body
        const normalizedEmail = normalizeEmail(email)
        const normalizedUserName = normalizeUserName(userName)

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const currentUserId = req.user?._id?.toString()
        const isAdmin = req.user?.role === 'Admin'
        const targetUserId = id?.toString()
        
        if (!isAdmin && currentUserId !== targetUserId) {
            return res.status(403).json({ message: 'You can only update your own profile' })
        }

        if (!name || !normalizedUserName || !address || !phone || !normalizedEmail) {
            return res.status(400).json({ message: 'All required fields must be provided' })
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({ message: 'Invalid email format' })
        }
        
        const user = await User.findById(id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        
        user.name = name
        user.userName = normalizedUserName
        user.address = String(address).trim()
        user.phone = String(phone).trim()
        user.email = normalizedEmail
        
        if (role !== undefined && (role === 'Admin' || role === 'User')) {
            if (isAdmin) {
                user.role = role
            }
        }
        
        if (password && password.trim() !== '') {
            if (password.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters long' })
            }
            user.password = await bcrypt.hash(password, 10)
        }
        
        await user.save()
        
        return res.json({ message: `User ${user.userName} updated`, user: { ...user._doc, password: undefined } })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: error.keyPattern?.email ? 'Email already exists' : 'Username already exists' })
        }
        console.error('Error updating user:', error)
        return res.status(500).json({ message: 'Server error updating user' })
    }
}

const getCurrentUserProfile = async (req, res) => {
    const userId = req.user?._id
    
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' })
    }
    
    try {
        const user = await User.findById(userId).select('-password').lean()
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        
        return res.json(user)
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ message: 'Server error' })
    }
}

const logout = async (req, res) => {
    res.clearCookie('accessToken', { ...authCookieOptions, maxAge: undefined })
    return res.clearCookie('csrfToken', { ...csrfCookieOptions, maxAge: undefined }).status(204).end()
}

const forgotPassword = async (req, res) => {
    const { email } = req.body
    const normalizedEmail = normalizeEmail(email)
    const genericResponse = { message: 'If the email exists, a reset link has been sent' }
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' })
    }
    
    try {
        const user = await User.findOne({ email: normalizedEmail })
        
        if (!user) {
            return res.json(genericResponse)
        }
        
        await PasswordReset.deleteMany({ userId: user._id })
        
        const resetToken = crypto.randomBytes(32).toString('hex')
        
        await PasswordReset.create({
            userId: user._id,
            email: user.email,
            token: hashResetToken(resetToken)
        })
        
        const emailResult = await sendPasswordResetEmail(email, resetToken, user.name)
        
        if (!emailResult.success) {
            console.error('❌ שליחת המייל נכשלה:', emailResult.error)
            return res.json(genericResponse)
        }
        
        return res.json(genericResponse)
    } catch (error) {
        console.error('❌ שגיאה באיפוס סיסמה:', error)
        return res.status(500).json({ message: 'Server error. Please try again later.' })
    }
}

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body
    
    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' })
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' })
    }
    
    try {
        const resetRecord = await PasswordReset.findOne({ token: hashResetToken(token) })
        
        if (!resetRecord) {
            return res.status(400).json({ message: 'Invalid or expired reset token' })
        }
        if (Date.now() - resetRecord.createdAt.getTime() > 60 * 60 * 1000) {
            await PasswordReset.deleteOne({ _id: resetRecord._id })
            return res.status(400).json({ message: 'Invalid or expired reset token' })
        }
        
        const user = await User.findById(resetRecord.userId)
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        
        // עדכון הסיסמה
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        await user.save()
        
        await PasswordReset.deleteOne({ _id: resetRecord._id })
        
        return res.json({ message: 'Password has been reset successfully' })
    } catch (error) {
        console.error('Reset password error:', error)
        return res.status(500).json({ message: 'Server error. Please try again later.' })
    }
}

module.exports = { login, register, getAllUser, getUserById, deleteUser, updateUser, logout, getCurrentUserProfile, forgotPassword, resetPassword }