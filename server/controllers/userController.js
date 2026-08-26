const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const User = require("../models/User")
const PasswordReset = require("../models/PasswordReset")
const { sendPasswordResetEmail } = require("../config/emailService")


const register = async (req, res) => {
    const { name, userName, address, phone, email, password } = req.body
    
    if (!name || !userName || !address || !phone || !email || !password)
        return res.status(400).json({ message: 'All fields are required' })
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' })
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' })
    }
    
    const userExist = await User.findOne({ userName: userName }).lean()
    if (userExist)
        return res.status(409).json({ message: "Duplicate username" })
    
    const emailExist = await User.findOne({ email: email }).lean()
    if (emailExist)
        return res.status(409).json({ message: "Email already exists" })
    
    try {
        const bcryptPassword = await bcrypt.hash(password, 10)
        const userObj = { name, userName, address, phone, email, password: bcryptPassword}
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
        if (!userName || !password)
            return res.status(400).json({ message: 'All fields are required' })
        const foundUser = await User.findOne({ userName }).lean()
        if (!foundUser) {
            return res.status(401).json({ message: 'Unauthorized' })

        }
        const okPassword = await bcrypt.compare(password, foundUser.password)
        if (!okPassword) return res.status(401).json({ message: 'Unauthorized' })


        const userInfo = { _id: foundUser._id.toString(), name: foundUser.name, email: foundUser.email, userName: foundUser.userName, role: foundUser.role }
        const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' })
        res.json({ token: token })
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

        const currentUserId = req.user?._id?.toString()
        const isAdmin = req.user?.role === 'Admin'
        const targetUserId = id?.toString()
        
        if (!isAdmin && currentUserId !== targetUserId) {
            return res.status(403).json({ message: 'You can only update your own profile' })
        }

        if (!name || !userName || !address || !phone || !email) {
            return res.status(400).json({ message: 'All required fields must be provided' })
        }
        
        const user = await User.findById(id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        
        user.name = name
        user.userName = userName
        user.address = address
        user.phone = phone
        user.email = email
        
        if (role !== undefined && (role === 'Admin' || role === 'User')) {
            if (isAdmin) {
                user.role = role
            }
        }
        
        if (password && password.trim() !== '') {
            user.password = await bcrypt.hash(password, 10)
        }
        
        await user.save()
        
        return res.json({ message: `User ${user.userName} updated`, user: { ...user._doc, password: undefined } })
    } catch (error) {
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
    const cookies = req.cookies
    
    if (!cookies?.jwt) {
        return res.status(204).json({ message: 'No token to clear' })
    }
    
    res.clearCookie('jwt', { 
        httpOnly: true, 
        sameSite: 'None', 
        secure: true 
    })
    
    return res.json({ message: 'Logout successful' })
}

const forgotPassword = async (req, res) => {
    const { email } = req.body
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' })
    }
    
    try {
        const user = await User.findOne({ email })
        
        if (!user) {
            return res.json({ message: 'If the email exists, a reset link has been sent' })
        }
        
        await PasswordReset.deleteMany({ userId: user._id })
        
        const resetToken = crypto.randomBytes(32).toString('hex')
        
        await PasswordReset.create({
            userId: user._id,
            email: user.email,
            token: resetToken
        })
        
        const emailResult = await sendPasswordResetEmail(email, resetToken, user.name)
        
        if (!emailResult.success) {
            console.error('❌ שליחת המייל נכשלה:', emailResult.error)
            return res.json({ message: 'If the email exists, a reset link has been sent' })
        }
        
        return res.json({ message: 'Password reset link has been sent to your email' })
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
        const resetRecord = await PasswordReset.findOne({ token })
        
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