const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? format.json()
      : format.combine(
          format.colorize(),
          format.printf(({ level, message, timestamp, stack }) =>
            `${timestamp} [${level}] ${stack || message}`
          )
        )
  ),
  transports: [new transports.Console()],
});

module.exports = logger;
