/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const jwt = require("jsonwebtoken");
const { AppError, ERROR_TYPES } = require("../utils/errors");
const logger = require("../utils/logger");

// Get JWT private key from environment, with sensible default for development
const jwtPrivateKey = process.env.JWT_PRIVATE_KEY || 'dev-key-change-in-production';

module.exports = (req, res, next) => {
    try {
        const token = req.header("x-auth-token");
        if (!token) {
            const error = new AppError(ERROR_TYPES.UNAUTHORIZED, 401, "Access denied. No token provided.");
            return next(error);
        }

        const decoded = jwt.verify(token, jwtPrivateKey);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            const authError = new AppError(ERROR_TYPES.UNAUTHORIZED, 401, "Invalid token.");
            return next(authError);
        }
        if (error.name === 'TokenExpiredError') {
            const authError = new AppError(ERROR_TYPES.UNAUTHORIZED, 401, "Token expired.");
            return next(authError);
        }
        next(error);
    }
};
// TODO: Improve performance


// error handler middleware
module.exports.errorHandler = (err, req, res, next) => {
    if (!req || !res) {
        console.error('Error handler called with invalid arguments:', err);
        return;
    }
    // Log error
    // logger.error('Request error', {
    //     message: err.message,
    //     stack: err.stack,
    //     url: req.url,
    //     method: req.method,
    //     ip: req.ip,
    //     userAgent: req.get('User-Agent')
    // });

    // Handle AppError instances
    if (err instanceof require("../utils/errors").AppError) {
        return res.status(err.statusCode).json({
            error: {
                type: err.type,
                message: err.message
            }
        });
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        logger.warn('Validation error', { errors: err.errors });
        return res.status(400).json({
            error: {
                type: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: err.errors
            }
        });
    }

    // Handle Mongoose duplicate key errors
    if (err.code === 11000) {
        logger.warn('Duplicate key error', { error: err });
        return res.status(409).json({
            error: {
                type: 'DUPLICATE_ERROR',
                message: 'Duplicate entry found'
            }
        });
    }

    // Handle JWT errors (fallback)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        logger.warn('JWT error', { error: err.name, message: err.message });
        return res.status(401).json({
            error: {
                type: 'UNAUTHORIZED',
                message: err.message
            }
        });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message;

    res.status(statusCode).json({
        error: {
            type: 'INTERNAL_ERROR',
            message: message
        }
    });
};