
# Fraud Detection Logger Microservice

A Node.js microservice for detecting suspicious transactions in a banking system. It consumes transaction events from Kafka, analyzes them for fraud indicators, logs suspicious ones, and provides a REST API for querying flagged transactions. A Kafka producer script is also included to send test transactions.

---

## 🚀 Features

* **Kafka Consumer** – Listens to `transactions` topic for real-time data
* **Kafka Producer** – Sends test transactions for development/demo
* **Fraud Detection Engine** – Multiple rules to detect suspicious activity
* **REST API** – Query flagged transactions and system health
* **Structured Logging** – Using Winston
* **In-Memory Storage** – Fast detection & transaction storage
* **Graceful Shutdown** – Handles termination signals
* **Unit Tests** – Jest-based testing

---

## 🕵️ Fraud Detection Rules

1. **HIGH_AMOUNT_NON_USA** – Amount > $5000 and location ≠ USA
2. **RAPID_TRANSACTIONS** – Multiple transactions by the same user in < 10 seconds
3. **ROUND_AMOUNT** – Amount divisible by 1000

---

## 📂 Project Structure

```
fraud-detection-logger/
├── src/
│   ├── index.js                # Main entry point & Express server
│   ├── kafka/
│   │   ├── consumer.js         # Kafka consumer
│   │   └── producer.js         # Kafka producer
│   ├── models/
│   │   └── transaction.js      # Transaction schema & fraud rules
│   ├── routes/
│   │   └── fraudRoutes.js      # REST API routes
│   ├── services/
│   │   └── fraudDetectionService.js  # Fraud detection logic
│   └── utils/
│       └── logger.js           # Winston logger configuration
├── tests/
│   └── fraudDetection.test.js  # Unit tests
├── scripts/
│   └── test-api.js             # API testing script
├── logs/                        # Application logs
├── docker-compose.yml           # Docker setup for Kafka
├── .env                         # Environment variables
├── env.example                  # Environment template
├── package.json
└── README.md
```

---

## 📦 Installation

```bash
git clone <repository-url>
cd fraud-detection-logger
npm install
cp env.example .env
```

Edit `.env` with your configuration:

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

---

## 🐳 Quick Start with Docker

1. **Start Kafka using Docker Compose:**
```bash
docker-compose up -d
```

2. **Wait for Kafka to be ready (check logs):**
```bash
docker-compose logs kafka
```

3. **Start the fraud detection service:**
```bash
npm start
```

4. **In another terminal, send test transactions:**
```bash
npm run start:producer
```

---

## ▶️ Usage

### 1. Start the Main Service (Kafka Consumer + API)

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

This starts the Express server and Kafka consumer.

### 2. Send Test Transactions

```bash
npm run start:producer
```

This will send sample transactions to Kafka for testing the fraud detection.

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Test the API endpoints
npm run test:api
```

---

## 🧪 Testing Guide

### Step-by-Step Testing Process

1. **Start the Service:**
   ```bash
   npm start
   ```

2. **Send Test Transactions:**
   ```bash
   npm run start:producer
   ```

3. **Test API Endpoints in Postman:**

   **Health Check:**
   ```
   GET http://localhost:3000/health
   ```

   **Get All Fraudulent Transactions:**
   ```
   GET http://localhost:3000/frauds
   ```

   **Get Fraud by User ID:**
   ```
   GET http://localhost:3000/frauds/user_123
   ```

4. **Check Logs:**
   - Monitor the console output for fraud detection logs
   - Check the `logs/` directory for detailed logs

5. **Run Unit Tests:**
   ```bash
   npm test
   ```

### Expected Test Results

- **Producer:** Should send transactions and show "Transaction sent successfully"
- **Consumer:** Should process transactions and log fraud detections
- **API:** Should return flagged transactions based on fraud rules
- **Logs:** Should show transaction processing and fraud detection decisions

---

## 🔌 API Endpoints

**Health Check**
```http
GET /health
```
Response: `{"status": "ok", "timestamp": "..."}`

**Get All Fraudulent Transactions**
```http
GET /frauds
```
Response: Array of flagged transactions

**Get Fraud by User ID**
```http
GET /frauds/:userId
```
Response: Array of frauds for specific user

---

## 📜 Kafka Message Format

```json
{
  "transactionId": "txn_789",
  "userId": "user_123",
  "amount": 7400,
  "location": "Nigeria",
  "timestamp": "2025-07-30T10:12:00Z"
}
```

---

## 🛠 Troubleshooting

### Common Issues

* **Kafka Connection Failed:**
  - Ensure Kafka is running: `docker-compose ps`
  - Check `KAFKA_BROKERS` in `.env`
  - Verify Kafka is accessible: `telnet localhost 9092`

* **No Transactions Processed:**
  - Verify topic exists: `docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092`
  - Check consumer group: `docker-compose exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list`

* **API Not Responding:**
  - Check if service is running: `npm start`
  - Verify port 3000 is not in use
  - Check logs for errors

* **High Memory Usage:**
  - Transactions are stored in memory
  - Consider implementing database persistence for production

### Debug Commands

```bash
# Check Kafka status
docker-compose logs kafka

# List Kafka topics
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Check consumer groups
docker-compose exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list

# View application logs
tail -f logs/app.log
```

---

## 📊 Monitoring & Logs

The service logs:
- Transaction reception
- Fraud detection decisions
- API requests
- Error conditions

Logs are written to both console and `logs/` directory.

---

## 🔒 Security Considerations

- Input validation on API endpoints
- Rate limiting (can be added)
- Authentication/Authorization (not implemented - add for production)

---

## 📈 Performance

- In-memory transaction storage for fast access
- Kafka consumer with automatic offset management
- Efficient fraud rule evaluation

---

## 📜 License

MIT License – see LICENSE file.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Ensure all dependencies are properly configured

