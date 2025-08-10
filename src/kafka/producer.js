const { Kafka } = require('kafkajs');
require('dotenv').config();
const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: [process.env.KAFKA_BROKERS],
});
const producer = kafka.producer();

const run = async () => {
  await producer.connect();

  const now = new Date().toISOString();

  const messages = [
    // Rule 1: amount > 5000 and location != USA
    {
      transactionId: "txn_big_1",
      userId: "userA",
      amount: 7400,
      location: "Nigeria",
      timestamp: now,
    },
    // Rule 2: multiple transactions within 10s (same user)
    {
      transactionId: "txn_fast_1",
      userId: "userB",
      amount: 100,
      location: "USA",
      timestamp: new Date().toISOString(),
    },
    {
      transactionId: "txn_fast_2",
      userId: "userB",
      amount: 200,
      location: "USA",
      timestamp: new Date().toISOString(),
    },
    // Rule 3: amount divisible by 1000
    {
      transactionId: "txn_round_1",
      userId: "userC",
      amount: 3000,
      location: "USA",
      timestamp: new Date().toISOString(),
    },
    // Non-suspicious
    {
      transactionId: "txn_ok_1",
      userId: "userD",
      amount: 47,
      location: "USA",
      timestamp: new Date().toISOString(),
    },
  ];

  await producer.send({
    topic: process.env.KAFKA_TOPIC,
    messages: messages.map(m => ({ value: JSON.stringify(m) })),
  });

  console.log('All test transactions sent');
  await producer.disconnect();
};

run().catch(console.error);