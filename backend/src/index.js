const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const driverRoutes = require('./routes/drivers');
const walletRoutes = require('./routes/wallet');
const adminRoutes = require('./routes/admin');
const reportsRoutes = require('./routes/reports');
const ratingsRoutes = require('./routes/ratings');
const driverRegistrationRoutes = require('./routes/driverRegistration');
const { scheduleDailyLockout, scheduleNightWarning } = require('./utils/scheduler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Security middleware first
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const rideLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many ride requests. Please wait a moment.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

app.use(globalLimiter);
app.use('/api/rides/request', rideLimiter);
app.use('/api/auth/request-otp', authLimiter);
app.use('/api/auth/login', authLimiter);

app.set('io', io);

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/driver-registration', driverRegistrationRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Campus Chauffeur API running' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('ride:join', (rideId) => {
    socket.join(`ride:${rideId}`);
    console.log(`Socket ${socket.id} joined ride:${rideId}`);
  });

  socket.on('driver:location', (data) => {
    const { rideId, latitude, longitude } = data;
    io.to(`ride:${rideId}`).emit('ride:driver_location', { latitude, longitude });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scheduleDailyLockout();
  scheduleNightWarning();
  console.log('Scheduled jobs running: 4AM lockout, 11PM warning');
});