# Fraud Detection Logger Microservice

A Node.js microservice for detecting suspicious transactions in a banking system. The service consumes transaction events from Kafka, analyzes them for fraud indicators, logs suspicious ones, and provides a REST API for querying flagged transactions.

## Features

- **Kafka Consumer**: Continuously processes transaction events from Kafka
- **Fraud Detection Engine**: Implements multiple fraud detection rules
- **REST API**: Query flagged transactions and system statistics
- **Structured Logging**: Comprehensive logging with Winston
- **In-Memory Cache**: For deduplication and rapid transaction detection
- **Retry Queue**: Handles failed message processing with exponential backoff
- **Graceful Shutdown**: Proper cleanup on application termination
- **Unit Tests**: Comprehensive test coverage with Jest

## Fraud Detection Rules

1. **High Amount Non-USA**: Amount > $5000 and location is not "USA"
2. **Rapid Transactions**: Multiple transactions from same user in < 10 seconds
3. **Round Amount**: Amount is a round number divisible by 1000

## Architecture

```
src/
├── index.js                 # Main application entry point
├── kafka/
│   └── consumer.js         # Kafka consumer implementation
├── models/
│   └── transaction.js      # Transaction model and validation
├── routes/
│   └── fraudRoutes.js     # REST API routes
├── services/
│   └── fraudDetectionService.js  # Fraud detection logic
└── utils/
    └── logger.js           # Winston logger configuration
```

## Prerequisites

- Node.js >= 16.0.0
- Kafka cluster (for production)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fraud-detection-logger
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp env.example .env
```

4. Configure your environment variables in `.env`:
```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=transactions
KAFKA_GROUP_ID=fraud-detection-group
KAFKA_CLIENT_ID=fraud-detection-client

# Server Configuration
PORT=3000
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=info
```

## Usage

### Development

Start the application in development mode:
```bash
npm run dev
```

### Production

Start the application:
```bash
npm start
```

### Running Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## API Endpoints

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00Z",
  "service": "fraud-detection-logger",
  "version": "1.0.0",
  "uptime": 123.456,
  "memory": {
    "rss": 12345678,
    "heapTotal": 9876543,
    "heapUsed": 5432109
  },
  "kafka": {
    "connected": true
  }
}
```

### Get All Fraudulent Transactions
```http
GET /frauds
```

Response:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "transactionId": "txn_789",
      "userId": "user_123",
      "amount": 7400,
      "location": "Nigeria",
      "timestamp": "2025-07-30T10:12:00Z",
      "detectedAt": "2025-07-30T10:12:01Z",
      "violations": [
        {
          "rule": "HIGH_AMOUNT_NON_USA",
          "description": "Amount > $5000 and location is not USA",
          "severity": "HIGH"
        }
      ],
      "isSuspicious": true
    }
  ]
}
```

### Get Fraudulent Transactions by User ID
```http
GET /frauds/user_123
```

Response:
```json
{
  "success": true,
  "userId": "user_123",
  "count": 1,
  "data": [...]
}
```

### Get Statistics
```http
GET /stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalFraudulentTransactions": 5,
    "ruleBreakdown": {
      "HIGH_AMOUNT_NON_USA": 3,
      "ROUND_AMOUNT": 2,
      "RAPID_TRANSACTIONS": 1
    },
    "cacheStats": {
      "keys": 10,
      "ksize": 1024,
      "vsize": 2048
    }
  }
}
```

### Get Fraudulent Transactions by Rule
```http
GET /frauds/rule/HIGH_AMOUNT_NON_USA
```

Response:
```json
{
  "success": true,
  "rule": "HIGH_AMOUNT_NON_USA",
  "count": 3,
  "data": [...]
}
```

### Clear Cache (Admin)
```http
POST /admin/clear-cache
```

Response:
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

## Kafka Message Format

The service expects transaction messages in the following JSON format:

```json
{
  "transactionId": "txn_789",
  "userId": "user_123",
  "amount": 7400,
  "location": "Nigeria",
  "timestamp": "2025-07-30T10:12:00Z"
}
```

## Logging

The service uses Winston for structured logging. Logs are written to:
- Console (development)
- `logs/combined.log` (all levels)
- `logs/error.log` (error level only)

Log levels:
- `info`: General application events
- `warn`: Fraud detection events
- `error`: Errors and exceptions

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses (comma-separated) |
| `KAFKA_TOPIC` | `transactions` | Kafka topic to consume from |
| `KAFKA_GROUP_ID` | `fraud-detection-group` | Kafka consumer group ID |
| `KAFKA_CLIENT_ID` | `fraud-detection-client` | Kafka client ID |
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | Application environment |
| `LOG_LEVEL` | `info` | Logging level |

## Development

### Project Structure

```
fraud-detection-logger/
├── src/
│   ├── index.js
│   ├── kafka/
│   │   └── consumer.js
│   ├── models/
│   │   └── transaction.js
│   ├── routes/
│   │   └── fraudRoutes.js
│   ├── services/
│   │   └── fraudDetectionService.js
│   └── utils/
│       └── logger.js
├── tests/
│   └── fraudDetection.test.js
├── logs/
├── package.json
├── jest.config.js
├── env.example
└── README.md
```

### Adding New Fraud Rules

To add a new fraud detection rule:

1. Add the rule logic in `src/models/transaction.js`:
```javascript
// In checkFraudRules() method
if (this.amount > 10000) {
  violations.push({
    rule: 'VERY_HIGH_AMOUNT',
    description: 'Amount > $10000',
    severity: 'CRITICAL'
  });
}
```

2. Add corresponding tests in `tests/fraudDetection.test.js`

### Performance Considerations

- The service uses in-memory storage for fraudulent transactions
- User transaction cache has a 10-second TTL for rapid transaction detection
- Kafka consumer uses batch processing for better throughput
- Retry queue implements exponential backoff to prevent overwhelming the system

## Monitoring

### Health Checks

The `/health` endpoint provides:
- Application status
- Uptime
- Memory usage
- Kafka connection status

### Metrics

The `/stats` endpoint provides:
- Total fraudulent transactions
- Rule violation breakdown
- Cache statistics

## Troubleshooting

### Common Issues

1. **Kafka Connection Failed**
   - Verify Kafka brokers are running
   - Check `KAFKA_BROKERS` environment variable
   - Ensure network connectivity

2. **No Transactions Being Processed**
   - Verify Kafka topic exists
   - Check consumer group configuration
   - Review application logs for errors

3. **High Memory Usage**
   - Monitor fraudulent transactions count
   - Consider implementing data persistence
   - Review cache TTL settings

### Log Analysis

Key log patterns to monitor:
- `"Fraud detected"`: Suspicious transactions
- `"Error processing message"`: Kafka processing issues
- `"Failed to connect to Kafka"`: Connection problems

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
