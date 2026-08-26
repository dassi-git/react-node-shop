const express=require("express")
const router=express.Router()
const verifyJWT= require("../middleware/verifyJwt")
const admin= require("../middleware/admin")
const { loginLimiter, registerLimiter, passwordResetLimiter } = require("../middleware/rateLimiter")
const UserControllers=require("../controllers/userController")
const nodemailer = require('nodemailer')

router.post("/login", loginLimiter, UserControllers.login)
router.post("/register", registerLimiter, UserControllers.register)
router.post("/logout",UserControllers.logout)
router.post("/forgot-password", passwordResetLimiter, UserControllers.forgotPassword)
router.post("/reset-password", passwordResetLimiter, UserControllers.resetPassword)

router.get("/profile", verifyJWT, UserControllers.getCurrentUserProfile)
router.get("/", [verifyJWT, admin], UserControllers.getAllUser)

// Development-only test email route using Ethereal to verify email rendering
// Placed before the parameterized route so 'test-email' is not treated as an :id
if (process.env.NODE_ENV === 'development') {
	router.get('/test-email', async (req, res) => {
		try {
			const testAccount = await nodemailer.createTestAccount()
			const transporter = nodemailer.createTransport({
				host: 'smtp.ethereal.email',
				port: 587,
				secure: false,
				auth: {
					user: testAccount.user,
					pass: testAccount.pass
				}
			})

			const info = await transporter.sendMail({
				from: 'no-reply@example.com',
				to: process.env.EMAIL_USER || 'test@example.com',
				subject: 'Test Email from Dev',
				text: 'This is a test email to verify transporter and template rendering.'
			})

			const preview = nodemailer.getTestMessageUrl(info)
			return res.json({ success: true, previewUrl: preview, info: { accepted: info.accepted, rejected: info.rejected } })
		} catch (err) {
			console.error('Test email error:', err)
			return res.status(500).json({ success: false, error: err.message })
		}
	})
}

router.get("/:id", verifyJWT, UserControllers.getUserById)
router.delete("/:id", [verifyJWT, admin], UserControllers.deleteUser)
router.put("/:id", verifyJWT, UserControllers.updateUser)

module.exports=router