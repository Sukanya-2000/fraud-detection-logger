const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: [process.env.KAFKA_BROKERS],
});

const producer = kafka.producer();

const run = async () => {
  await producer.connect();
  const transaction = {
    transactionId: "txn_001",
    userId: "user_abc",
    amount: 7400,
    location: "Nigeria",
    timestamp: new Date().toISOString(),
  };

  await producer.send({
    topic: process.env.KAFKA_TOPIC,
    messages: [{ value: JSON.stringify(transaction) }],
  });

  console.log('Transaction sent');
  await producer.disconnect();
};

run();
