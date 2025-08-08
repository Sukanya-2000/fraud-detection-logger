const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');
const FraudDetectionService = require('../services/fraudDetectionService');

class KafkaConsumer {
    constructor() {
        this.kafka = new Kafka({
            clientId: process.env.KAFKA_CLIENT_ID || 'fraud-detection-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });

        this.consumer = this.kafka.consumer({
            groupId: process.env.KAFKA_GROUP_ID || 'fraud-detection-group',
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
            maxBytesPerPartition: 1048576, // 1MB
        });

        this.fraudDetectionService = new FraudDetectionService();
        this.isRunning = false;
        this.retryQueue = [];
        this.maxRetries = 3;
    }

    async connect() {
        try {
            await this.consumer.connect();
            logger.info('Kafka consumer connected successfully');

            await this.consumer.subscribe({
                topic: process.env.KAFKA_TOPIC || 'transactions',
                fromBeginning: false
            });

            logger.info(`Subscribed to topic: ${process.env.KAFKA_TOPIC || 'transactions'}`);
        } catch (error) {
            logger.error('Failed to connect to Kafka', { error: error.message });
            throw error;
        }
    }

    async start() {
        if (this.isRunning) {
            logger.warn('Consumer is already running');
            return;
        }

        try {
            await this.connect();
            this.isRunning = true;

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message, heartbeat }) => {
                    try {
                        await this.processMessage(message);
                        await heartbeat();
                    } catch (error) {
                        logger.error('Error processing message', {
                            error: error.message,
                            topic,
                            partition,
                            offset: message.offset
                        });

                        // Add to retry queue
                        await this.addToRetryQueue(message, 0);
                    }
                },
                eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
                    for (const message of batch.messages) {
                        if (!isRunning() || isStale()) break;

                        try {
                            await this.processMessage(message);
                            resolveOffset(message.offset);
                            await heartbeat();
                        } catch (error) {
                            logger.error('Error processing batch message', {
                                error: error.message,
                                topic: batch.topic,
                                partition: batch.partition,
                                offset: message.offset
                            });

                            await this.addToRetryQueue(message, 0);
                        }
                    }
                }
            });

            logger.info('Kafka consumer started successfully');

            // Start retry queue processor
            this.startRetryQueueProcessor();

        } catch (error) {
            logger.error('Failed to start Kafka consumer', { error: error.message });
            this.isRunning = false;
            throw error;
        }
    }

    async processMessage(message) {
        try {
            const messageValue = message.value.toString();
            const transactionData = JSON.parse(messageValue);

            logger.info('Received transaction message', {
                transactionId: transactionData.transactionId,
                userId: transactionData.userId,
                offset: message.offset
            });

            const result = await this.fraudDetectionService.processTransaction(transactionData);

            if (result.isSuspicious) {
                logger.warn('Suspicious transaction processed', {
                    transactionId: result.transaction.transactionId,
                    userId: result.transaction.userId,
                    violations: result.violations.map(v => v.rule)
                });
            }

        } catch (error) {
            logger.error('Error processing message', {
                error: error.message,
                messageValue: message.value?.toString(),
                offset: message.offset
            });
            throw error;
        }
    }

    async addToRetryQueue(message, retryCount) {
        if (retryCount >= this.maxRetries) {
            logger.error('Message processing failed after max retries', {
                offset: message.offset,
                retryCount
            });
            return;
        }

        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

        setTimeout(async () => {
            try {
                await this.processMessage(message);
                logger.info('Message processed successfully on retry', {
                    offset: message.offset,
                    retryCount: retryCount + 1
                });
            } catch (error) {
                logger.error('Retry failed', {
                    error: error.message,
                    offset: message.offset,
                    retryCount: retryCount + 1
                });

                // Add to retry queue again
                await this.addToRetryQueue(message, retryCount + 1);
            }
        }, retryDelay);
    }

    startRetryQueueProcessor() {
        // Process retry queue every 5 seconds
        setInterval(() => {
            if (this.retryQueue.length > 0) {
                logger.info(`Processing ${this.retryQueue.length} messages from retry queue`);
            }
        }, 5000);
    }

    async stop() {
        if (!this.isRunning) {
            logger.warn('Consumer is not running');
            return;
        }

        try {
            await this.consumer.disconnect();
            this.isRunning = false;
            logger.info('Kafka consumer stopped successfully');
        } catch (error) {
            logger.error('Error stopping Kafka consumer', { error: error.message });
            throw error;
        }
    }

    getFraudDetectionService() {
        return this.fraudDetectionService;
    }

    isConsumerRunning() {
        return this.isRunning;
    }
}

module.exports = KafkaConsumer;
