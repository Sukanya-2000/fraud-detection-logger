const logger = require('../utils/logger');

class Transaction {
    constructor(data) {
        this.transactionId = data.transactionId;
        this.userId = data.userId;
        this.amount = data.amount;
        this.location = data.location;
        this.timestamp = new Date(data.timestamp);
        this.detectedAt = new Date();
    }

    static validate(data) {
        const required = ['transactionId', 'userId', 'amount', 'location', 'timestamp'];
        const missing = required.filter(field => !data[field]);

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        if (typeof data.amount !== 'number' || data.amount <= 0) {
            throw new Error('Amount must be a positive number');
        }

        if (typeof data.location !== 'string' || data.location.trim() === '') {
            throw new Error('Location must be a non-empty string');
        }

        const timestamp = new Date(data.timestamp);
        if (isNaN(timestamp.getTime())) {
            throw new Error('Invalid timestamp format');
        }

        return true;
    }

    // Fraud detection rules
    checkFraudRules() {
        const violations = [];

        // Rule 1: Amount > $5000 and location is not "USA"
        if (this.amount > 5000 && this.location !== 'USA') {
            violations.push({
                rule: 'HIGH_AMOUNT_NON_USA',
                description: 'Amount > $5000 and location is not USA',
                severity: 'HIGH'
            });
        }

        // Rule 2: Amount is a round number divisible by 1000
        if (this.amount % 1000 === 0) {
            violations.push({
                rule: 'ROUND_AMOUNT',
                description: 'Amount is a round number divisible by 1000',
                severity: 'MEDIUM'
            });
        }

        return violations;
    }

    toJSON() {
        return {
            transactionId: this.transactionId,
            userId: this.userId,
            amount: this.amount,
            location: this.location,
            timestamp: this.timestamp.toISOString(),
            detectedAt: this.detectedAt.toISOString()
        };
    }
}

module.exports = Transaction;
