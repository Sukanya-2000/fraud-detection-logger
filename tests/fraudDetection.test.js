const Transaction = require('../src/models/transaction');
const FraudDetectionService = require('../src/services/fraudDetectionService');

describe('Transaction Model', () => {
    describe('Validation', () => {
        test('should validate correct transaction data', () => {
            const validData = {
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 1000,
                location: 'USA',
                timestamp: '2025-01-15T10:30:00Z'
            };

            expect(() => Transaction.validate(validData)).not.toThrow();
        });

        test('should throw error for missing required fields', () => {
            const invalidData = {
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 1000
                // missing location and timestamp
            };

            expect(() => Transaction.validate(invalidData)).toThrow('Missing required fields');
        });

        test('should throw error for invalid amount', () => {
            const invalidData = {
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: -100,
                location: 'USA',
                timestamp: '2025-01-15T10:30:00Z'
            };

            expect(() => Transaction.validate(invalidData)).toThrow('Amount must be a positive number');
        });

        test('should throw error for invalid location', () => {
            const invalidData = {
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 1000,
                location: '',
                timestamp: '2025-01-15T10:30:00Z'
            };

            expect(() => Transaction.validate(invalidData)).toThrow('Location must be a non-empty string');
        });

        test('should throw error for invalid timestamp', () => {
            const invalidData = {
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 1000,
                location: 'USA',
                timestamp: 'invalid-timestamp'
            };

            expect(() => Transaction.validate(invalidData)).toThrow('Invalid timestamp format');
        });
    });

    describe('Fraud Rules', () => {
        test('should flag high amount non-USA transaction', () => {
            const transaction = new Transaction({
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 6000,
                location: 'Nigeria',
                timestamp: '2025-01-15T10:30:00Z'
            });

            const violations = transaction.checkFraudRules();
            expect(violations).toHaveLength(1);
            expect(violations[0].rule).toBe('HIGH_AMOUNT_NON_USA');
        });

        test('should not flag high amount USA transaction', () => {
            const transaction = new Transaction({
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 6000,
                location: 'USA',
                timestamp: '2025-01-15T10:30:00Z'
            });

            const violations = transaction.checkFraudRules();
            expect(violations).toHaveLength(0);
        });

        test('should flag round amount transaction', () => {
            const transaction = new Transaction({
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 5000,
                location: 'USA',
                timestamp: '2025-01-15T10:30:00Z'
            });

            const violations = transaction.checkFraudRules();
            expect(violations).toHaveLength(1);
            expect(violations[0].rule).toBe('ROUND_AMOUNT');
        });

        test('should not flag non-round amount transaction', () => {
            const transaction = new Transaction({
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 1234,
                location: 'USA',
                timestamp: '2025-01-15T10:30:00Z'
            });

            const violations = transaction.checkFraudRules();
            expect(violations).toHaveLength(0);
        });

        test('should flag transaction with multiple violations', () => {
            const transaction = new Transaction({
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 10000,
                location: 'Nigeria',
                timestamp: '2025-01-15T10:30:00Z'
            });

            const violations = transaction.checkFraudRules();
            expect(violations).toHaveLength(2);
            expect(violations.map(v => v.rule)).toContain('HIGH_AMOUNT_NON_USA');
            expect(violations.map(v => v.rule)).toContain('ROUND_AMOUNT');
        });
    });
});

describe('FraudDetectionService', () => {
    let fraudService;

    beforeEach(() => {
        fraudService = new FraudDetectionService();
    });

    describe('Transaction Processing', () => {
        test('should process valid transaction without fraud', async () => {
            const transactionData = {
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 100,
                location: 'USA',
                timestamp: '2025-01-15T10:30:00Z'
            };

            const result = await fraudService.processTransaction(transactionData);

            expect(result.isSuspicious).toBe(false);
            expect(result.violations).toHaveLength(0);
            expect(result.transaction.transactionId).toBe('txn_123');
        });

        test('should flag suspicious transaction', async () => {
            const transactionData = {
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: 6000,
                location: 'Nigeria',
                timestamp: '2025-01-15T10:30:00Z'
            };

            const result = await fraudService.processTransaction(transactionData);

            expect(result.isSuspicious).toBe(true);
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].rule).toBe('HIGH_AMOUNT_NON_USA');
        });

        test('should throw error for invalid transaction data', async () => {
            const invalidData = {
                transactionId: 'txn_123',
                userId: 'user_456',
                amount: -100,
                location: 'USA',
                timestamp: '2025-01-15T10:30:00Z'
            };

            await expect(fraudService.processTransaction(invalidData)).rejects.toThrow();
        });
    });

    describe('Rapid Transaction Detection', () => {
        test('should flag rapid transactions from same user', async () => {
            const userId = 'user_123';

            // First transaction
            const transaction1 = {
                transactionId: 'txn_1',
                userId: userId,
                amount: 100,
                location: 'USA',
                timestamp: '2025-01-15T10:30:00Z'
            };

            // Second transaction within 10 seconds
            const transaction2 = {
                transactionId: 'txn_2',
                userId: userId,
                amount: 200,
                location: 'USA',
                timestamp: '2025-01-15T10:30:05Z'
            };

            // Process first transaction
            const result1 = await fraudService.processTransaction(transaction1);
            expect(result1.isSuspicious).toBe(false);

            // Process second transaction - should be flagged
            const result2 = await fraudService.processTransaction(transaction2);
            expect(result2.isSuspicious).toBe(true);
            expect(result2.violations).toHaveLength(1);
            expect(result2.violations[0].rule).toBe('RAPID_TRANSACTIONS');
        });

        test('should not flag transactions from different users', async () => {
            const transaction1 = {
                transactionId: 'txn_1',
                userId: 'user_123',
                amount: 100,
                location: 'USA',
                timestamp: '2025-01-15T10:30:00Z'
            };

            const transaction2 = {
                transactionId: 'txn_2',
                userId: 'user_456', // Different user
                amount: 200,
                location: 'USA',
                timestamp: '2025-01-15T10:30:05Z'
            };

            const result1 = await fraudService.processTransaction(transaction1);
            const result2 = await fraudService.processTransaction(transaction2);

            expect(result1.isSuspicious).toBe(false);
            expect(result2.isSuspicious).toBe(false);
        });
    });

    describe('Data Retrieval', () => {
        beforeEach(async () => {
            // Add some test data
            const transactions = [
                {
                    transactionId: 'txn_1',
                    userId: 'user_123',
                    amount: 6000,
                    location: 'Nigeria',
                    timestamp: '2025-01-15T10:30:00Z'
                },
                {
                    transactionId: 'txn_2',
                    userId: 'user_123',
                    amount: 5000,
                    location: 'USA',
                    timestamp: '2025-01-15T10:31:00Z'
                },
                {
                    transactionId: 'txn_3',
                    userId: 'user_456',
                    amount: 7000,
                    location: 'Canada',
                    timestamp: '2025-01-15T10:32:00Z'
                }
            ];

            for (const transaction of transactions) {
                await fraudService.processTransaction(transaction);
            }
        });

        test('should return all fraudulent transactions', () => {
            const allFrauds = fraudService.getAllFraudulentTransactions();
            expect(allFrauds).toHaveLength(3);
        });

        test('should return fraudulent transactions by user ID', () => {
            const userFrauds = fraudService.getFraudulentTransactionsByUserId('user_123');
            expect(userFrauds).toHaveLength(2);
            expect(userFrauds.every(t => t.userId === 'user_123')).toBe(true);
        });

        test('should return fraudulent transactions by rule', () => {
            const highAmountFrauds = fraudService.getFraudulentTransactionsByRule('HIGH_AMOUNT_NON_USA');
            expect(highAmountFrauds).toHaveLength(2);
            expect(highAmountFrauds.every(t =>
                t.violations.some(v => v.rule === 'HIGH_AMOUNT_NON_USA')
            )).toBe(true);
        });

        test('should return correct statistics', () => {
            const stats = fraudService.getStats();

            expect(stats.totalFraudulentTransactions).toBe(3);
            expect(stats.ruleBreakdown).toHaveProperty('HIGH_AMOUNT_NON_USA');
            expect(stats.ruleBreakdown).toHaveProperty('ROUND_AMOUNT');
        });
    });

    describe('Cache Management', () => {
        test('should clear cache', () => {
            fraudService.clearCache();
            const stats = fraudService.userTransactionCache.getStats();
            expect(stats.keys).toBe(0);
        });
    });
});
