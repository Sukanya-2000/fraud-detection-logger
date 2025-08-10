const promClient = require('prom-client');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom business metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const fraudDetectionDuration = new promClient.Histogram({
    name: 'fraud_detection_duration_seconds',
    help: 'Duration of fraud detection processing in seconds',
    labelNames: ['result', 'rule_violations'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const fraudDetectionsTotal = new promClient.Counter({
    name: 'fraud_detections_total',
    help: 'Total number of fraud detection operations',
    labelNames: ['result', 'rule_violations']
});

const kafkaMessagesProcessed = new promClient.Counter({
    name: 'kafka_messages_processed_total',
    help: 'Total number of Kafka messages processed',
    labelNames: ['status', 'topic']
});

const kafkaMessageProcessingDuration = new promClient.Histogram({
    name: 'kafka_message_processing_duration_seconds',
    help: 'Duration of Kafka message processing in seconds',
    labelNames: ['status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const retryQueueSize = new promClient.Gauge({
    name: 'retry_queue_size',
    help: 'Current size of the retry queue'
});

const cacheHitRatio = new promClient.Gauge({
    name: 'cache_hit_ratio',
    help: 'Cache hit ratio (0-1)'
});

const activeConnections = new promClient.Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
});

// Register all metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(fraudDetectionDuration);
register.registerMetric(fraudDetectionsTotal);
register.registerMetric(kafkaMessagesProcessed);
register.registerMetric(kafkaMessageProcessingDuration);
register.registerMetric(retryQueueSize);
register.registerMetric(cacheHitRatio);
register.registerMetric(activeConnections);

// Helper functions for metrics
const metrics = {
    // HTTP metrics
    recordHttpRequest: (method, route, statusCode, duration) => {
        httpRequestDurationMicroseconds
            .labels(method, route, statusCode)
            .observe(duration);
        
        httpRequestsTotal
            .labels(method, route, statusCode)
            .inc();
    },

    // Fraud detection metrics
    recordFraudDetection: (result, ruleViolations, duration) => {
        const violations = ruleViolations.length > 0 ? 'with_violations' : 'no_violations';
        
        fraudDetectionDuration
            .labels(result, violations)
            .observe(duration);
        
        fraudDetectionsTotal
            .labels(result, violations)
            .inc();
    },

    // Kafka metrics
    recordKafkaMessage: (status, topic, duration) => {
        kafkaMessagesProcessed
            .labels(status, topic)
            .inc();
        
        if (duration !== undefined) {
            kafkaMessageProcessingDuration
                .labels(status)
                .observe(duration);
        }
    },

    // Queue metrics
    updateRetryQueueSize: (size) => {
        retryQueueSize.set(size);
    },

    // Cache metrics
    updateCacheHitRatio: (ratio) => {
        cacheHitRatio.set(ratio);
    },

    // Connection metrics
    updateActiveConnections: (count) => {
        activeConnections.set(count);
    },

    // Get metrics for Prometheus endpoint
    getMetrics: async () => {
        return await register.metrics();
    },

    // Get metrics in JSON format for debugging
    getMetricsAsJSON: async () => {
        const metrics = await register.getMetricsAsJSON();
        return metrics;
    }
};

module.exports = metrics;
