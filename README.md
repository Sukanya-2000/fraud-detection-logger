
# Fraud Detection Logger Microservice

A Node.js microservice for detecting suspicious transactions in a banking system.
It consumes transaction events from Kafka, analyzes them for fraud indicators, logs suspicious ones, and provides a REST API for querying flagged transactions.
A Kafka producer script is also included to send test transactions.

---

## 🚀 Features

* **Kafka Consumer** – Listens to `transactions` topic for real-time data.
* **Kafka Producer** – Sends test transactions for development/demo.
* **Fraud Detection Engine** – Multiple rules to detect suspicious activity.
* **REST API** – Query flagged transactions and system statistics.
* **Structured Logging** – Using Winston.
* **In-Memory Cache** – Fast detection & deduplication.
* **Retry Queue** – For failed Kafka message processing.
* **Graceful Shutdown** – Handles termination signals.
* **Unit Tests** – Jest-based testing.

---

## 🕵️ Fraud Detection Rules

1. **HIGH\_AMOUNT\_NON\_USA** – Amount > \$5000 and location ≠ USA
2. **RAPID\_TRANSACTIONS** – Multiple transactions by the same user in < 10s
3. **ROUND\_AMOUNT** – Amount divisible by 1000

---

## 📂 Project Structure

```
fraud-detection-logger/
├── src/
│   ├── index.js                # Main entry point
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
│       └── index.js           # Winston logger config
├── tests/
│   └── fraudDetection.test.js
├── .env
├── env.example
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
# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=transactions
KAFKA_GROUP_ID=fraud-detection-group
KAFKA_CLIENT_ID=fraud-detection-client

# Server
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

---

## ▶️ Usage

### 1. Start Kafka Consumer (Main App)

```bash
npm run dev
```

Runs the service with hot reload.

Or:

```bash
npm start
```

Runs the service in production mode.

---

### 2. Send Test Transactions (Kafka Producer)

```bash
npm run start:producer
```

This will send a sample transaction to Kafka for testing.

---

### 3. Run Tests

```bash
npm test
npm run test:watch
```

---

## 🔌 API Endpoints

**Health Check**

```http
GET /health
```

**Get All Fraudulent Transactions**

```http
GET /frauds
```

**Get Fraud by User ID**

```http
GET /frauds/:userId
```

**Get Statistics**

```http
GET /stats
```

**Get Fraud by Rule**

```http
GET /frauds/rule/:ruleName
```

**Clear Cache (Admin)**

```http
POST /admin/clear-cache
```

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

* **Kafka not connecting** – Check `KAFKA_BROKERS` and Kafka status.
* **No transactions processed** – Verify topic and consumer group configs.
* **High memory usage** – Clear cache or persist transactions to DB.

---

## 📜 License

MIT License – see LICENSE file.

---

