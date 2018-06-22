import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

const level: string = process.env.LOG_LEVEL || 'info';

export const logger = new winston.Logger({
  level,
  transports: [
    new winston.transports.Console({ level }),
    new winston.transports.File({
      level: 'error',
      filename: 'error.log'
    }),
    new DailyRotateFile({
      level,
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true
    })
  ]
});