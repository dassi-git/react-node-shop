# 🛒 react-node-shop

A learning-focused e-commerce application built with the MERN stack, with server-side validation, authentication, payment integrations, and operational safeguards. Review the production checklist before deployment.

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

**Frontend:** React 18.3, Redux Toolkit, RTK Query, PrimeReact
**Backend:** Node.js, Express 5, MongoDB, Mongoose  
**Security:** JWT, bcrypt, express-rate-limit, helmet  
**Logging:** Winston  
**Email:** Nodemailer

## ⚙️ Installation

### Prerequisites
- Node.js 18+
- MongoDB 6+ (local or hosted)
- Gmail account with an app password (only if email features are enabled)

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
DATABASE_URI=mongodb://localhost:27017/ecommerce
ACCESS_TOKEN_SECRET=your-super-secret-key
PORT=8888
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

Start MongoDB before starting the server. The server exposes `GET /health` for
process health and `GET /ready` for MongoDB readiness.

`client/.env`:
```env
REACT_APP_API_URL=http://localhost:8888
REACT_APP_API_BASE_URL=http://localhost:8888/api/
```

For deployment, copy `server/.env.production.example` to `server/.env.production`
and `client/.env.production.example` to `client/.env.production`, then replace
every placeholder with production values from the deployment secret store. Set
`NODE_ENV=production` before running `npm run start:production` in `server`.
Production loads only `.env.production`, requires a managed MongoDB URI, and
never falls back to the in-memory database. The current customer payment flow
is manual; Stripe and PayPal configuration remains available for a future rollout.

For Stripe test payments, also configure `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` in `server/.env`. Send `checkout.session.completed`
events to `POST /api/payment/stripe/webhook`; the server verifies the Stripe
signature before marking an order as paid.

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

### Validation

```bash
# Server smoke tests
cd server
npm test

# Client tests and production build
cd ../client
npm test -- --watchAll=false --runInBand
npm run build
```

Health endpoints:

- `GET /health` confirms that the server process is running.
- `GET /ready` confirms that the server is connected to MongoDB.

### Working With The Project

For the prioritized work queue, definition of done, validation order, and a
copy-paste prompt for the next development session, read
[`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## 🔒 Security Features

### Rate Limits
- Login: 5 attempts / 15 min per IP
- Register: 3 accounts / hour per IP
- Password Reset: 3 attempts / 15 min per IP
- General API: 100 requests / 15 min
- Payment mutations: protected by a dedicated limiter

### Authentication
- JWT tokens (24h expiration)
- bcrypt password hashing (10 rounds)
- Secure HTTP-only cookies
- CSRF protection for cookie-authenticated state-changing requests

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

### Orders (Protected)
```http
POST   /api/order                   # Create order from the server-side basket
GET    /api/order/my                # Current user's orders
GET    /api/order/:id               # Get an order
POST   /api/order/:id/accept-quote  # Accept a quote
GET    /api/order/admin             # All orders (Admin)
PUT    /api/order/:id/status        # Update order status (Admin)
```

### Quotes (Protected)
```http
POST /api/quote                   # Create quote (Admin)
GET  /api/quote/order/:orderId    # Quotes for an order
PUT  /api/quote/:id/accept        # Accept quote
PUT  /api/quote/:id/reject        # Reject quote
```

### Payments (Protected)
```http
POST /api/payment                            # Create internal payment
GET  /api/payment/order/:orderId             # Payments for an order
PUT  /api/payment/:id/confirm                # Confirm payment (Admin)
POST /api/payment/stripe/checkout            # Create Stripe checkout
POST /api/payment/stripe/complete/:sessionId # Complete Stripe checkout
POST /api/payment/paypal/order               # Create PayPal order
POST /api/payment/paypal/capture/:orderId    # Capture PayPal order
POST /api/payment/stripe/webhook             # Stripe webhook (signature verified)
```

### Bundles
```http
GET    /api/bundle      # All bundles
POST   /api/bundle      # Create bundle (Admin)
DELETE /api/bundle/:id  # Delete bundle (Admin)
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
    ├── services/          # Shared business services
    ├── scripts/            # Maintenance and utility scripts
    ├── data/               # Local MongoDB data (development only)
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
