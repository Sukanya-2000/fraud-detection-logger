const Transaction = require('../models/transaction');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const NodeCache = require('node-cache');

class FraudDetectionService {
    constructor() {
        // Cache for tracking recent transactions per user (10 second window)
        this.userTransactionCache = new NodeCache({ stdTTL: 10 });
        this.fraudulentTransactions = [];
    }

    async processTransaction(transactionData) {
        const startTime = Date.now();
        try {
            // Validate transaction data
            Transaction.validate(transactionData);

            const transaction = new Transaction(transactionData);

            logger.info('Processing transaction', {
                transactionId: transaction.transactionId,
                userId: transaction.userId,
                amount: transaction.amount,
                location: transaction.location
            });

            const fraudViolations = [];

            // Check individual transaction rules
            const individualViolations = transaction.checkFraudRules();
            fraudViolations.push(...individualViolations);

            // Check for rapid transactions (multiple transactions from same user in < 10 seconds)
            const rapidTransactionViolation = this.checkRapidTransactions(transaction);
            if (rapidTransactionViolation) {
                fraudViolations.push(rapidTransactionViolation);
            }

            // Calculate processing duration
            const duration = (Date.now() - startTime) / 1000;
            const result = fraudViolations.length > 0 ? 'suspicious' : 'clean';

            // If any violations found, flag as suspicious
            if (fraudViolations.length > 0) {
                const fraudRecord = {
                    ...transaction.toJSON(),
                    violations: fraudViolations,
                    isSuspicious: true
                };

                this.fraudulentTransactions.push(fraudRecord);

                logger.warn('Fraud detected', {
                    transactionId: transaction.transactionId,
                    userId: transaction.userId,
                    violations: fraudViolations.map(v => v.rule),
                    amount: transaction.amount,
                    location: transaction.location
                });

                // Record metrics for suspicious transaction
                metrics.recordFraudDetection(result, fraudViolations, duration);

                return {
                    isSuspicious: true,
                    violations: fraudViolations,
                    transaction: fraudRecord
                };
            }

            // Record metrics for clean transaction
            metrics.recordFraudDetection(result, fraudViolations, duration);

            return {
                isSuspicious: false,
                violations: [],
                transaction: transaction.toJSON()
            };

        } catch (error) {
            // Record metrics for failed processing
            const duration = (Date.now() - startTime) / 1000;
            metrics.recordFraudDetection('failed', [], duration);
            
            logger.error('Error processing transaction', {
                error: error.message,
                transactionData
            });
            throw error;
        }
    }

    checkRapidTransactions(transaction) {
        const userKey = `user_${transaction.userId}`;
        const now = Date.now();

        // Get existing transactions for this user
        let userTransactions = this.userTransactionCache.get(userKey) || [];

        // Filter out transactions older than 10 seconds
        userTransactions = userTransactions.filter(t => (now - t.timestamp) < 10000);

        // Add current transaction
        userTransactions.push({
            transactionId: transaction.transactionId,
            timestamp: now
        });

        // Update cache
        this.userTransactionCache.set(userKey, userTransactions);

        // If more than 1 transaction in 10 seconds, flag as suspicious
        if (userTransactions.length > 1) {
            return {
                rule: 'RAPID_TRANSACTIONS',
                description: `Multiple transactions from same user in < 10 seconds (${userTransactions.length} transactions)`,
                severity: 'HIGH',
                transactionCount: userTransactions.length
            };
        }

        return null;
    }

    getAllFraudulentTransactions() {
        return this.fraudulentTransactions;
    }

    getFraudulentTransactionsByUserId(userId) {
        return this.fraudulentTransactions.filter(
            transaction => transaction.userId === userId
        );
    }

    getFraudulentTransactionsByRule(rule) {
        return this.fraudulentTransactions.filter(
            transaction => transaction.violations.some(v => v.rule === rule)
        );
    }

    getStats() {
        const totalFrauds = this.fraudulentTransactions.length;
        const ruleStats = {};

        this.fraudulentTransactions.forEach(transaction => {
            transaction.violations.forEach(violation => {
                ruleStats[violation.rule] = (ruleStats[violation.rule] || 0) + 1;
            });
        });

        // Calculate cache hit ratio
        const cacheStats = this.userTransactionCache.getStats();
        const hitRatio = cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0;
        metrics.updateCacheHitRatio(hitRatio);

        return {
            totalFraudulentTransactions: totalFrauds,
            ruleBreakdown: ruleStats,
            cacheStats: cacheStats,
            cacheHitRatio: hitRatio
        };
    }

    clearCache() {
        this.userTransactionCache.flushAll();
    }
}

module.exports = FraudDetectionService;
