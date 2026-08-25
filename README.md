# 🛒 react-node-shop

A professional, production-ready e-commerce application built with the MERN stack featuring enterprise-grade security, comprehensive error handling, and advanced middleware protection.

## 🌟 Key Features

### Security & Authentication
- 🔐 JWT Authentication with 24-hour expiration
- 🛡️ Rate Limiting on sensitive endpoints
- 🔒 bcrypt Password Hashing
- 🚫 Role-based Access Control (Admin/User)
- 🛡️ Helmet.js security headers
- ⚡ Try-catch error handling on all async operations

### User Management
- User Registration & Login
- Profile Management
- Password Reset via Email
- Admin Panel
- Role-based Permissions

### Product & Shopping
- Product CRUD Operations
- Image Upload & Storage
- Stock Management
- Dynamic Shopping Basket
- Real-time Stock Validation

### Advanced Features
- 📝 Winston Logger
- 🎯 Centralized Constants
- 📧 Email Notifications
- 🔄 RESTful API
- ⚡ Optimized Queries

## 🛠️ Tech Stack

**Frontend:** React 19, Redux Toolkit, RTK Query, PrimeReact  
**Backend:** Node.js, Express 5, MongoDB, Mongoose  
**Security:** JWT, bcrypt, express-rate-limit, helmet  
**Logging:** Winston  
**Email:** Nodemailer

## ⚙️ Installation

### Prerequisites
- Node.js (v14+)
- MongoDB
- Gmail account (for emails)

### Setup

**1. Clone & Install**
```bash
git clone https://github.com/dassi-git/react-node-shop.git
cd react-node-shop

# Server
cd server
npm install

# Client
cd ../client
npm install
```

**2. Configure Environment**

`server/.env`:
```env
MONGO_URI=mongodb://localhost:27017/ecommerce
ACCESS_TOKEN_SECRET=your-super-secret-key
PORT=8888
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

`client/.env`:
```env
REACT_APP_API_URL=http://localhost:8888
REACT_APP_API_BASE_URL=http://localhost:8888/api/
```

**3. Run Application**
```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm start
```

Access at: `http://localhost:3000`

## 🔒 Security Features

### Rate Limits
- Login: 5 attempts / 15 min
- Register: 3 accounts / hour
- Password Reset: 3 attempts / 15 min
- API: 100 requests / 15 min

### Authentication
- JWT tokens (24h expiration)
- bcrypt password hashing (10 rounds)
- Secure HTTP-only cookies

## 📚 API Documentation

### Authentication
```http
POST /api/user/register    # Create account
POST /api/user/login        # Get JWT token
POST /api/user/forgot-password
POST /api/user/reset-password
```

### Users (Protected)
```http
GET    /api/user/profile    # Current user
GET    /api/user            # All users (Admin)
GET    /api/user/:id        # User by ID
PUT    /api/user/:id        # Update user
DELETE /api/user/:id        # Delete user (Admin)
```

### Products
```http
GET    /api/product         # All products
GET    /api/product/:id     # Product by ID
POST   /api/product         # Create (Admin)
PUT    /api/product         # Update (Admin)
DELETE /api/product/:id     # Delete (Admin)
```

### Basket (Protected)
```http
GET    /api/basket          # Get user basket
POST   /api/basket/:id      # Add to basket
DELETE /api/basket/:id      # Remove item
DELETE /api/basket          # Clear basket
```

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── features/      # Redux features
│   │   └── components/    # React components
│   └── public/
└── server/                # Express backend
    ├── config/            # Configuration
    │   ├── constants.js   # App constants
    │   ├── logger.js      # Winston setup
    │   └── emailService.js
    ├── controllers/       # Business logic
    ├── middleware/        # Auth & validation
    ├── models/            # Mongoose schemas
    ├── routes/            # API routes
    └── logs/              # Application logs
```

## 🚀 Deployment

**Server:**
1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set secure JWT secret
4. Update CLIENT_URL

**Client:**
1. Update API URLs
2. Build: `npm run build`
3. Deploy to Netlify/Vercel

## 📝 Logs

Logs stored in `server/logs/`:
- `error.log` - Errors only
- `combined.log` - All logs

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Open Pull Request

## 📄 License

ISC License

## 👨‍💻 Author

Dassi Git Team

---

**Note:** This is a learning project. Conduct security audits before production use.
