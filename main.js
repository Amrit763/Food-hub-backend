const express = require('express');
const app = express();
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const session = require('express-session');
const passport = require('./middleware/passport');
const config = require('./config');
const http = require('http');
const { initializeSocket } = require('./socket');

// Connect to MongoDB
const connectDB = require('./config/dbConnection');
connectDB();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const chefRoutes = require('./routes/chef.routes');
const productRoutes = require('./routes/product.routes');
const twofactorRoutes = require('./routes/twofactor.routes');
const googleAuthRoutes = require('./routes/google-auth.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/orders.routes');
const priceCalculatorRoutes = require('./routes/price-calculator.routes');
const reviewRoutes = require('./routes/review.routes');
const chatRoutes = require('./routes/chat.routes');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// CORS configuration - adjust for your frontend
// app.use(cors({
//     origin: process.env.CLIENT_URL || 'http://localhost:3000',
//     credentials: true
// }));

const defaultProfilePath = path.join(__dirname, 'uploads/profiles/default-profile.png');

app.use(cors({
    origin: 'http://localhost:4200', // Angular dev server URL
    credentials: true
}));

// Security HTTP headers
app.use(helmet());

// Session configuration for Passport
app.use(session({
    secret: config.jwtSecretKey, // Use same secret for simplicity
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Secure in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// In main.js, replace your current CORS setup with:
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});
  
// For images specifically, add this before your static files middleware
app.use('/uploads', (req, res, next) => {
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes); // Google auth routes
app.use('/api/auth/2fa', twofactorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chefs', chefRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes); // Orders routes
app.use('/api', priceCalculatorRoutes); // Price calculator routes
app.use('/api/reviews', reviewRoutes); // Reviews routes
app.use('/api/chats', chatRoutes); // Chat routes

// API status route
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date()
    });
});

// Error handling middleware
app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({
        success: false,
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Start server
const PORT = config.port;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    // Close server & exit process
    // server.close(() => process.exit(1));
});