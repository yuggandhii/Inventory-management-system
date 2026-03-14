import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { authRoutes } from './modules/auth/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { productRoutes } from './modules/products/routes.js';
import { categoryRoutes } from './modules/categories/routes.js';
import { warehouseRoutes } from './modules/warehouses/routes.js';
import { receiptRoutes } from './modules/receipts/routes.js';
import { deliveryRoutes } from './modules/deliveries/routes.js';
import { transferRoutes } from './modules/transfers/routes.js';
import { adjustmentRoutes } from './modules/adjustments/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { moveHistoryRoutes } from './modules/move-history/routes.js';
import { profileRoutes } from './modules/profile/routes.js';
import { authenticate } from './middleware/auth.js';
import { requestLogger } from './middleware/requestLogger.js';
import { AppError } from './lib/AppError.js';
import { config } from './config/index.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/products', authenticate, productRoutes);
app.use('/api/categories', authenticate, categoryRoutes);
app.use('/api/warehouses', authenticate, warehouseRoutes);
app.use('/api/receipts', authenticate, receiptRoutes);
app.use('/api/deliveries', authenticate, deliveryRoutes);
app.use('/api/transfers', authenticate, transferRoutes);
app.use('/api/adjustments', authenticate, adjustmentRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/move-history', authenticate, moveHistoryRoutes);
app.use('/api/profile', authenticate, profileRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

// SPA fallback: serve index.html for non-API GET requests (e.g. /login, /dashboard)
app.get('*', (req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
  next();
});

// 404 for unknown API routes
app.use((req, res, next) => next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404)));

// Error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const isPrismaNotFound = err.code === 'P2025';
  const status = err.statusCode ?? err.status ?? (isPrismaNotFound ? 404 : 500);
  const message =
    err.message || (isPrismaNotFound ? 'Resource not found' : 'Internal server error');

  if (status >= 500 && config.nodeEnv === 'development') {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(config.nodeEnv === 'development' && err.stack && { stack: err.stack }),
  });
});

export default app;
