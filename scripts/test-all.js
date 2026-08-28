const axios = require('axios');

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

function logFail(msg, error) {
  console.error(`Error: ${msg}`);
  if (error && error.response) {
    console.error(`  Status: ${error.response.status}`);
    console.error(`  Data: ${JSON.stringify(error.response.data)}`);
  } else if (error) {
    console.error(`  Error: ${error.message}`);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForOrderStatus(orderId, expectedStatus, headers, maxAttempts = 15) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await axios.get(`${GATEWAY_URL}/api/v1/orders/${orderId}`, { headers });
      if (res.data && res.data.status === expectedStatus) {
        return res.data;
      }
    } catch (err) {
      if (err.response && err.response.status === 429) {
        await sleep(3000);
      }
    }
    await sleep(1500);
  }
  const finalRes = await axios.get(`${GATEWAY_URL}/api/v1/orders/${orderId}`, { headers });
  return finalRes.data;
}

async function runE2ETests() {
  console.log('Starting E2E System Integration Test Suite');
  console.log(`Target Gateway: ${GATEWAY_URL}`);

  try {
    console.log('\n1. API Gateway Health Check');
    const healthRes = await axios.get(`${GATEWAY_URL}/health`);
    console.log(`Health Status: ${healthRes.data.status}`);

    console.log('\n2. Prometheus Metrics Endpoint');
    const metricsRes = await axios.get(`${GATEWAY_URL}/metrics`);
    if (metricsRes.data.includes('orderflow_')) {
      console.log('Prometheus metrics prefix orderflow_ verified');
    } else {
      throw new Error('Prometheus metrics missing orderflow_ prefix');
    }

    console.log('\n3. User Authentication');
    let accessToken;
    let userId;
    try {
      const loginRes = await axios.post(`${GATEWAY_URL}/api/v1/auth/login`, {
        email: 'sysadmin@example.com',
        password: 'Sysadmin@123',
      });
      accessToken = loginRes.data.accessToken;
      userId = loginRes.data.user.id;
      console.log(`Authenticated as System Admin: ${loginRes.data.user.email} (${userId})`);
    } catch (loginErr) {
      const testEmail = `user_${Date.now()}@example.com`;
      const regRes = await axios.post(`${GATEWAY_URL}/api/v1/auth/register`, {
        email: testEmail,
        password: 'CustomerPassword123!',
        fullName: 'E2E Test User',
      });
      accessToken = regRes.data.accessToken;
      userId = regRes.data.user.id;
      console.log(`Registered and authenticated Customer: ${regRes.data.user.email} (${userId})`);
    }

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'x-user-id': userId,
    };

    console.log('\n4. Create Product');
    const sku = `MACBOOK-PRO-M4-${Date.now()}`;
    const createProductRes = await axios.post(
      `${GATEWAY_URL}/api/v1/products`,
      {
        name: 'MacBook Pro M4 Max 16-inch',
        sku,
        price: 3499.99,
        description: 'High Performance Laptop',
        quantity: 100,
      },
      { headers: authHeaders },
    );
    const product = createProductRes.data;
    console.log(`Created Product #${product.id} (SKU: ${product.sku})`);

    console.log('\n5. Read Product Catalog and Redis Caching');
    const listStart = Date.now();
    const listRes1 = await axios.get(`${GATEWAY_URL}/api/v1/products`);
    const listDuration1 = Date.now() - listStart;
    console.log(`Primary DB Query: ${listRes1.data.length} products (${listDuration1}ms)`);

    const listStart2 = Date.now();
    const listRes2 = await axios.get(`${GATEWAY_URL}/api/v1/products`);
    const listDuration2 = Date.now() - listStart2;
    console.log(`Redis Cache Hit: ${listRes2.data.length} products (${listDuration2}ms)`);

    console.log('\n6. Create Order');
    const createOrderRes = await axios.post(
      `${GATEWAY_URL}/api/v1/orders`,
      {
        customerId: userId,
        items: [{ productId: product.id, quantity: 2, price: product.price }],
      },
      { headers: authHeaders },
    );
    const order1 = createOrderRes.data;
    console.log(`Created Order #${order1.id} (Status: ${order1.status})`);

    await sleep(3000);

    console.log('\n7. Process Payment Webhook SUCCESS');
    const checkoutRes = await axios.post(
      `${GATEWAY_URL}/api/v1/payments/checkout`,
      {
        orderId: order1.id,
        amount: order1.totalAmount,
        paymentMethod: 'VNPAY',
      },
      { headers: authHeaders },
    );
    const paymentSession = checkoutRes.data;

    await axios.post(`${GATEWAY_URL}/api/v1/payments/webhook`, {
      transactionId: paymentSession.transactionId,
      status: 'SUCCESS',
    });
    console.log(`Processed Payment SUCCESS Webhook for Txn: ${paymentSession.transactionId}`);

    const verifiedOrder1 = await waitForOrderStatus(order1.id, 'CONFIRMED', authHeaders);
    if (verifiedOrder1.status === 'CONFIRMED') {
      console.log(`Order #${order1.id} status transitioned to CONFIRMED`);
    } else {
      throw new Error(`Expected Order status CONFIRMED but received ${verifiedOrder1.status}`);
    }

    console.log('\n8. Process Payment Webhook FAILED (Saga Rollback)');
    const createOrderRes2 = await axios.post(
      `${GATEWAY_URL}/api/v1/orders`,
      {
        customerId: userId,
        items: [{ productId: product.id, quantity: 1, price: product.price }],
      },
      { headers: authHeaders },
    );
    const order2 = createOrderRes2.data;

    await sleep(3000);

    const checkoutRes2 = await axios.post(
      `${GATEWAY_URL}/api/v1/payments/checkout`,
      {
        orderId: order2.id,
        amount: order2.totalAmount,
        paymentMethod: 'VNPAY',
      },
      { headers: authHeaders },
    );

    await axios.post(`${GATEWAY_URL}/api/v1/payments/webhook`, {
      transactionId: checkoutRes2.data.transactionId,
      status: 'FAILED',
      reason: 'Insufficient funds',
    });
    console.log(`Processed Payment FAILED Webhook for Txn: ${checkoutRes2.data.transactionId}`);

    const verifiedOrder2 = await waitForOrderStatus(order2.id, 'CANCELLED', authHeaders);
    if (verifiedOrder2.status === 'CANCELLED') {
      console.log(`Order #${order2.id} status transitioned to CANCELLED`);
    } else {
      throw new Error(`Expected Order status CANCELLED but received ${verifiedOrder2.status}`);
    }

    console.log('\nAll E2E integration tests completed successfully.');
  } catch (err) {
    logFail('E2E integration test suite failed', err);
    process.exit(1);
  }
}

runE2ETests();
