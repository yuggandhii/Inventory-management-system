import { config } from '../config/index.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const log = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;
    if (config.nodeEnv === 'development') {
      console.log(log);
    }
  });
  next();
}
