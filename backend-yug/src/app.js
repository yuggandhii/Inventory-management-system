require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const db = require('./db');

const authRoutes        = require('./modules/auth/routes');
const productRoutes     = require('./modules/products/routes');
const warehouseRoutes   = require('./modules/warehouse/routes');
const receiptRoutes     = require('./modules/receipts/routes');
const deliveryRoutes    = require('./modules/deliveries/routes');
const transferRoutes    = require('./modules/transfers/routes');
const adjustmentRoutes  = require('./modules/adjustments/routes');
const stockRoutes       = require('./modules/stock/routes');
const dashboardRoutes   = require('./modules/dashboard/routes');
const moveHistoryRoutes = require('./modules/dashboard/moveHistory.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use((req, res, next) => { logger.info(`${req.method} ${req.originalUrl}`); next(); });

app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/products',     productRoutes);
app.use('/api/warehouses',   warehouseRoutes);
app.use('/api/receipts',     receiptRoutes);
app.use('/api/deliveries',   deliveryRoutes);
app.use('/api/transfers',    transferRoutes);
app.use('/api/adjustments',  adjustmentRoutes);
app.use('/api/stock',        stockRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/move-history', moveHistoryRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;
db.raw('SELECT 1').then(() => {
  app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}).catch((err) => {
  logger.error('DB connection failed', err);
  process.exit(1);
});

module.exports = app;
