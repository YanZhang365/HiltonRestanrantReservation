import logger from './logger.js';

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : '服务器内部错误';

  logger.error(`[${statusCode}] ${message} - ${req.originalUrl} - ${req.method}`);

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export const notFoundHandler = (req, res, next) => {
  const err = new AppError(`接口 ${req.originalUrl} 不存在`, 404);
  next(err);
};