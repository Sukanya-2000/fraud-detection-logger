
# Fraud Detection Logger

A microservice for detecting suspicious transactions in a banking system using Kafka for message processing and Express.js for the API.

## Features

- **Real-time Fraud Detection**: Processes transaction messages from Kafka streams
- **Multiple Fraud Rules**: High amount detection, location-based rules, rapid transaction detection
- **RESTful API**: Endpoints for querying fraud data and system statistics
- **Kafka Integration**: Robust message consumption with retry mechanisms
- **Comprehensive Logging**: Structured logging with Winston
- **In-Memory Caching**: Node-cache for transaction deduplication
- **Unit Testing**: Jest-based test suite for fraud detection logic
- **Prometheus Metrics**: Comprehensive monitoring and observability

## Prometheus Integration

This service includes full Prometheus metrics integration for comprehensive monitoring:

### Available Metrics

#### HTTP Metrics
- `http_requests_total` - Total HTTP requests by method, route, and status code
- `http_request_duration_seconds` - Request duration histogram

#### Business Metrics
- `fraud_detections_total` - Fraud detection operations by result and rule violations
- `fraud_detection_duration_seconds` - Fraud detection processing time

#### Kafka Metrics
- `kafka_messages_processed_total` - Kafka messages processed by status and topic
- `kafka_message_processing_duration_seconds` - Message processing time

#### System Metrics
- `retry_queue_size` - Current size of the retry queue
- `cache_hit_ratio` - Cache hit ratio (0-1)
- `active_connections` - Number of active Kafka connections

#### Default Node.js Metrics
- CPU usage, memory usage, event loop lag
- Garbage collection statistics
- Active handles and requests

### Metrics Endpoint

Access Prometheus metrics at: `GET /metrics`

The endpoint returns metrics in Prometheus exposition format, ready for scraping.

### Monitoring Setup

#### Option 1: Docker Compose (Recommended)

```bash
# Start the entire monitoring stack
docker-compose up -d

# Access services:
# - Fraud Detection API: http://localhost:3000
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
```

#### Option 2: Manual Prometheus Setup

1. Download Prometheus from [prometheus.io](https://prometheus.io/download/)
2. Use the provided `prometheus.yml` configuration
3. Point Prometheus to your service at `http://localhost:3000/metrics`

### Grafana Dashboards

After starting Grafana:

1. Login with `admin/admin`
2. Add Prometheus as a data source: `http://prometheus:9090`
3. Import dashboards or create custom ones using the available metrics

### Key Metrics to Monitor

- **Request Rate**: `rate(http_requests_total[5m])`
- **Error Rate**: `rate(http_requests_total{status_code=~"5.."}[5m])`
- **Fraud Detection Latency**: `histogram_quantile(0.95, fraud_detection_duration_seconds_bucket)`
- **Kafka Processing Rate**: `rate(kafka_messages_processed_total[5m])`
- **Cache Performance**: `cache_hit_ratio`
- **Retry Queue Health**: `retry_queue_size`

## Quick Start

### Prerequisites

- Node.js 16+
- Kafka cluster (or use the provided Docker setup)
- Docker and Docker Compose (for monitoring)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fraud-detection-logger

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Start the service
npm run dev

# In another terminal, test the API
npm run test:api

# Run tests
npm test
```

### Environment Variables

```bash
# Server configuration
PORT=3000
NODE_ENV=development

# Kafka configuration
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=transactions
KAFKA_CLIENT_ID=fraud-detection-client
KAFKA_GROUP_ID=fraud-detection-group

# Logging
LOG_LEVEL=info
```

## API Endpoints

- `GET /` - Service information and available endpoints
- `GET /health` - Health check with Kafka connection status
- `GET /frauds` - Get all fraudulent transactions
- `GET /frauds/:userId` - Get frauds by user ID
- `GET /frauds/rule/:rule` - Get frauds by rule type
- `GET /stats` - System statistics and cache performance
- `GET /metrics` - Prometheus metrics (for monitoring)

## Fraud Detection Rules

1. **High Amount Non-USA**: Transactions > $5000 from non-USA locations
2. **Round Amount**: Transactions with round amounts (e.g., $1000, $5000)
3. **Rapid Transactions**: Multiple transactions from same user within 10 seconds

## Architecture

```
Kafka → Consumer → Fraud Detection Service → API Endpoints
                ↓
            Retry Queue (with exponential backoff)
                ↓
            In-Memory Cache (deduplication)
                ↓
            Prometheus Metrics
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Test API endpoints
npm run test:api
```

## Monitoring and Observability

The service provides comprehensive monitoring through:

- **Structured Logging**: JSON-formatted logs with timestamps
- **Health Checks**: Kafka connection status and service health
- **Performance Metrics**: Request duration, processing times
- **Business Metrics**: Fraud detection rates and rule violations
- **System Metrics**: Cache performance, queue sizes, connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

