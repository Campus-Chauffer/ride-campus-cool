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
const announcementsRoutes = require('./routes/announcements');
const { scheduleDailyLockout, scheduleNightWarning } = require('./utils/scheduler');
const pool = require('./db/pool');

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

// ── Rate limiters ──────────────────────────────────────────────────────────
// Everything below is keyed by IP address by default (express-rate-limit's
// standard behaviour). On a shared campus WiFi network, many students and
// drivers can share the same public IP due to NAT — meaning a strict IP-based
// limit doesn't actually mean "10 attempts per person," it can mean
// "10 attempts total for everyone on that network combined." Two things
// address this: authenticated routes now key by user ID instead of IP
// (each real person gets their own quota regardless of shared network), and
// the pre-auth limits (where there's no user ID yet) are loosened enough to
// tolerate a burst of real, simultaneous sign-ins from one campus network.

// Global limiter — broad safety net, IP-based since it covers unauthenticated
// requests too. Raised from 60 to 120/min to give more headroom on shared IPs.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// (The ride-request limiter lives in routes/rides.js, scoped to that route —
// it used to also be declared here but was never mounted, just duplicated.)

// OTP/login — the highest-risk limiter, since it runs before authentication
// exists, meaning it MUST be IP-based. Loosened from 10 to 20 attempts per
// 15 minutes specifically to tolerate a burst of real students signing in
// from the same shared campus network at the same time (e.g. right after
// a beta invite goes out to a WhatsApp group).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

app.use(globalLimiter);
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
app.use('/api/announcements', announcementsRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Campus Chauffeur API running' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('ride:join', (rideId) => {
    socket.join(`ride:${rideId}`);
    console.log(`Socket ${socket.id} joined ride:${rideId}`);
  });

  socket.on('driver:location', async (data) => {
    const { rideId, latitude, longitude, heading } = data;
    // heading was previously dropped here, so every passenger-facing car
    // marker rendered with rotation=0 regardless of the driver's actual
    // bearing — this is what "stuck facing one direction" was.
    io.to(`ride:${rideId}`).emit('ride:driver_location', { latitude, longitude, heading });

    // Persist so current_lat/current_lng isn't frozen at "last seen before
    // pickup" for the rest of the trip — anything that reads driver position
    // via the DB (the passenger's polling fallback, admin views) would
    // otherwise never see movement during an active ride, only the socket
    // listeners would, making location updates depend entirely on socket
    // uptime instead of degrading gracefully.
    try {
      await pool.query(
        `UPDATE drivers SET current_lat = $1, current_lng = $2
         WHERE id = (SELECT driver_id FROM trips WHERE id = $3)`,
        [latitude, longitude, rideId]
      );
    } catch (err) {
      console.error('Driver location persist error:', err);
    }
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