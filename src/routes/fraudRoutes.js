const express = require('express');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to inject fraud detection service
const injectFraudService = (req, res, next) => {
    req.fraudService = req.app.get('fraudDetectionService');
    next();
};

// Health check endpoint
router.get('/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'fraud-detection-logger',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        kafka: {
            connected: req.app.get('kafkaConsumer')?.isConsumerRunning() || false
        }
    };

    logger.info('Health check requested', { health });
    res.status(200).json(health);
});

// Get all fraudulent transactions
router.get('/frauds', injectFraudService, (req, res) => {
    try {
        const fraudulentTransactions = req.fraudService.getAllFraudulentTransactions();

        logger.info('Retrieved all fraudulent transactions', {
            count: fraudulentTransactions.length
        });

        res.status(200).json({
            success: true,
            count: fraudulentTransactions.length,
            data: fraudulentTransactions
        });
    } catch (error) {
        logger.error('Error retrieving fraudulent transactions', {
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Get fraudulent transactions by user ID
router.get('/frauds/:userId', injectFraudService, (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const fraudulentTransactions = req.fraudService.getFraudulentTransactionsByUserId(userId);

        logger.info('Retrieved fraudulent transactions for user', {
            userId,
            count: fraudulentTransactions.length
        });

        res.status(200).json({
            success: true,
            userId,
            count: fraudulentTransactions.length,
            data: fraudulentTransactions
        });
    } catch (error) {
        logger.error('Error retrieving fraudulent transactions for user', {
            error: error.message,
            userId: req.params.userId
        });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Get statistics
router.get('/stats', injectFraudService, (req, res) => {
    try {
        const stats = req.fraudService.getStats();

        logger.info('Retrieved fraud detection statistics', { stats });

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error retrieving statistics', {
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Get fraudulent transactions by rule
router.get('/frauds/rule/:rule', injectFraudService, (req, res) => {
    try {
        const { rule } = req.params;

        if (!rule) {
            return res.status(400).json({
                success: false,
                error: 'Rule parameter is required'
            });
        }

        const fraudulentTransactions = req.fraudService.getFraudulentTransactionsByRule(rule);

        logger.info('Retrieved fraudulent transactions by rule', {
            rule,
            count: fraudulentTransactions.length
        });

        res.status(200).json({
            success: true,
            rule,
            count: fraudulentTransactions.length,
            data: fraudulentTransactions
        });
    } catch (error) {
        logger.error('Error retrieving fraudulent transactions by rule', {
            error: error.message,
            rule: req.params.rule
        });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Clear cache (admin endpoint)
router.post('/admin/clear-cache', injectFraudService, (req, res) => {
    try {
        req.fraudService.clearCache();

        logger.info('Cache cleared by admin request');

        res.status(200).json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        logger.error('Error clearing cache', {
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

module.exports = router;
