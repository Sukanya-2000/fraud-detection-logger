require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const metrics = require('./utils/metrics');
const KafkaConsumer = require('./kafka/consumer');
const fraudRoutes = require('./routes/fraudRoutes');

class FraudDetectionApp {
  constructor() {
    this.app = express();
    this.kafkaConsumer = new KafkaConsumer();
    this.server = null;
    this.port = process.env.PORT || 3000;
  }

  async initialize() {
    try {
      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Start Kafka consumer
      await this.startKafkaConsumer();

      // Start HTTP server
      await this.startServer();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      logger.info('Fraud detection application initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize application', { error: error.message });
      process.exit(1);
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());

    // CORS middleware
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Metrics middleware for HTTP requests
    this.app.use((req, res, next) => {
      const start = Date.now();

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function (...args) {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        const route = req.route ? req.route.path : req.path;
        const statusCode = res.statusCode;

        // Record metrics
        metrics.recordHttpRequest(req.method, route, statusCode, duration);

        // Call original end method
        originalEnd.apply(this, args);
      };

      next();
    });

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  setupRoutes() {
    // Make services available to routes
    this.app.set('fraudDetectionService', this.kafkaConsumer.getFraudDetectionService());
    this.app.set('kafkaConsumer', this.kafkaConsumer);

    // API routes
    this.app.use('/', fraudRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Fraud Detection Logger',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          frauds: '/frauds',
          fraudsByUser: '/frauds/:userId',
          stats: '/stats',
          fraudsByRule: '/frauds/rule/:rule',
          metrics: '/metrics'
        }
      });
    });

    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', 'text/plain');
        const metricsData = await metrics.getMetrics();
        res.send(metricsData);
      } catch (error) {
        logger.error('Error getting metrics', { error: error.message });
        res.status(500).send('Error collecting metrics');
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `Route ${req.method} ${req.originalUrl} not found`
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  async startKafkaConsumer() {
    try {
      await this.kafkaConsumer.start();
      logger.info('Kafka consumer started successfully');
    } catch (error) {
      logger.error('Failed to start Kafka consumer', { error: error.message });
      // Don't exit the app if Kafka is not available, just log the error
      // The app can still serve the API endpoints
    }
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`HTTP server started on port ${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('HTTP server error', { error: error.message });
        reject(error);
      });
    });
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);

      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close((err) => {
            if (err) {
              logger.error('Error closing HTTP server', { error: err.message });
            } else {
              logger.info('HTTP server closed');
            }
          });
        }

        // Stop Kafka consumer
        if (this.kafkaConsumer) {
          await this.kafkaConsumer.stop();
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        logger.error('Error during graceful shutdown', { error: error.message });
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });
  }
}

// Start the application
if (require.main === module) {
  const app = new FraudDetectionApp();
  app.initialize().catch((error) => {
    logger.error('Failed to start application', { error: error.message });
    process.exit(1);
  });
}

module.exports = FraudDetectionApp;
