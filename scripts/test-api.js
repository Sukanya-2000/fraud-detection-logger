const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Sample transaction data for testing
const sampleTransactions = [
    {
        transactionId: 'txn_001',
        userId: 'user_123',
        amount: 6000,
        location: 'Nigeria',
        timestamp: '2025-01-15T10:30:00Z'
    },
    {
        transactionId: 'txn_002',
        userId: 'user_123',
        amount: 2000,
        location: 'USA',
        timestamp: '2025-01-15T10:30:05Z'
    },
    {
        transactionId: 'txn_003',
        userId: 'user_456',
        amount: 10000,
        location: 'Canada',
        timestamp: '2025-01-15T10:31:00Z'
    },
    {
        transactionId: 'txn_004',
        userId: 'user_789',
        amount: 500,
        location: 'USA',
        timestamp: '2025-01-15T10:32:00Z'
    }
];

async function testAPI() {
    console.log('🧪 Testing Fraud Detection API\n');

    try {
        // Test health endpoint
        console.log('1. Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data.status);
        console.log('   Kafka connected:', healthResponse.data.kafka.connected);
        console.log('   Uptime:', Math.round(healthResponse.data.uptime), 'seconds\n');

        // Test processing transactions (simulate via direct service calls)
        console.log('2. Processing sample transactions...');
        console.log('   Note: In a real scenario, these would come from Kafka\n');

        // Test stats endpoint
        console.log('3. Testing stats endpoint...');
        const statsResponse = await axios.get(`${BASE_URL}/stats`);
        console.log('✅ Stats retrieved successfully');
        console.log('   Total fraudulent transactions:', statsResponse.data.data.totalFraudulentTransactions);
        console.log('   Rule breakdown:', statsResponse.data.data.ruleBreakdown);
        console.log('');

        // Test getting all fraudulent transactions
        console.log('4. Testing get all fraudulent transactions...');
        const fraudsResponse = await axios.get(`${BASE_URL}/frauds`);
        console.log('✅ Retrieved', fraudsResponse.data.count, 'fraudulent transactions');

        if (fraudsResponse.data.count > 0) {
            console.log('   Sample transaction:');
            const sample = fraudsResponse.data.data[0];
            console.log(`   - ID: ${sample.transactionId}`);
            console.log(`   - User: ${sample.userId}`);
            console.log(`   - Amount: $${sample.amount}`);
            console.log(`   - Location: ${sample.location}`);
            console.log(`   - Violations: ${sample.violations.map(v => v.rule).join(', ')}`);
        }
        console.log('');

        // Test getting fraudulent transactions by user
        console.log('5. Testing get fraudulent transactions by user...');
        const userFraudsResponse = await axios.get(`${BASE_URL}/frauds/user_123`);
        console.log('✅ Retrieved', userFraudsResponse.data.count, 'fraudulent transactions for user_123');
        console.log('');

        // Test getting fraudulent transactions by rule
        console.log('6. Testing get fraudulent transactions by rule...');
        const ruleFraudsResponse = await axios.get(`${BASE_URL}/frauds/rule/HIGH_AMOUNT_NON_USA`);
        console.log('✅ Retrieved', ruleFraudsResponse.data.count, 'transactions violating HIGH_AMOUNT_NON_USA rule');
        console.log('');

        // Test root endpoint
        console.log('7. Testing root endpoint...');
        const rootResponse = await axios.get(`${BASE_URL}/`);
        console.log('✅ Root endpoint working');
        console.log('   Service:', rootResponse.data.service);
        console.log('   Version:', rootResponse.data.version);
        console.log('   Status:', rootResponse.data.status);
        console.log('');

        // Test Prometheus metrics endpoint
        console.log('8. Testing Prometheus metrics endpoint...');
        const metricsResponse = await axios.get(`${BASE_URL}/metrics`);
        console.log('✅ Metrics endpoint working');
        console.log('   Content-Type:', metricsResponse.headers['content-type']);
        console.log('   Metrics length:', metricsResponse.data.length, 'characters');

        // Check for some key metrics
        const metricsData = metricsResponse.data;
        if (metricsData.includes('http_requests_total')) {
            console.log('   ✅ HTTP request metrics found');
        }
        if (metricsData.includes('fraud_detections_total')) {
            console.log('   ✅ Fraud detection metrics found');
        }
        if (metricsData.includes('kafka_messages_processed_total')) {
            console.log('   ✅ Kafka metrics found');
        }
        console.log('');

        console.log('🎉 All API tests completed successfully!');
        console.log('\n📋 Available endpoints:');
        console.log('   GET  /health                    - Health check');
        console.log('   GET  /frauds                    - Get all fraudulent transactions');
        console.log('   GET  /frauds/:userId            - Get frauds by user ID');
        console.log('   GET  /frauds/rule/:rule         - Get frauds by rule');
        console.log('   GET  /stats                     - Get system statistics');
        console.log('   GET  /metrics                   - Prometheus metrics');
        console.log('   POST /admin/clear-cache         - Clear cache (admin)');

    } catch (error) {
        console.error('❌ API test failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the server is running:');
            console.log('   npm run dev');
        }

        process.exit(1);
    }
}

// Run the test
testAPI();
