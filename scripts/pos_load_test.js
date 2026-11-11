/**
 * Concurrent POS Load Tester (50 concurrent users)
 * Usage: node scripts/pos_load_test.js [baseUrl]
 */

const BASE_URL = process.argv[2] || "http://127.0.0.1:8000";
const CONCURRENCY = 50;
const ITERATIONS_PER_USER = 4; // 200 total checkout transactions across 50 parallel workers

async function main() {
  console.log(`\n======================================================`);
  console.log(`   POS Load Test: 50 Concurrent Users Benchmark       `);
  console.log(`======================================================`);
  console.log(`Target API URL: ${BASE_URL}`);
  console.log(`Concurrent Workers: ${CONCURRENCY}`);
  console.log(`Transactions per Worker: ${ITERATIONS_PER_USER}`);
  console.log(`Total Sales Target: ${CONCURRENCY * ITERATIONS_PER_USER}\n`);

  // 1. Initial Login to obtain Cashier token
  console.log("Authenticating cashier user...");
  let token;
  try {
    const loginRes = await fetch(`${BASE_URL}/api/v1/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: "cashier@inventory.test",
        password: "Password123!",
      }),
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed with HTTP ${loginRes.status}`);
    }
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log("Cashier authenticated successfully.\n");
  } catch (err) {
    console.error(`Cannot connect to backend: ${err.message}`);
    console.log("Ensure the Laravel backend server is running: php artisan serve");
    process.exit(1);
  }

  // 2. Query available products for checkout
  const searchRes = await fetch(`${BASE_URL}/api/v1/products/pos/search?q=`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  console.log(`Search response status: ${searchRes.status}`);
  const searchData = await searchRes.json();
  if (!searchRes.ok) {
    console.log("Search error payload:", searchData);
  }
  const availableProducts = (searchData.data || []).filter((p) => p.stock_qty > 0);

  if (availableProducts.length === 0) {
    console.error("No products with stock found for checkout load testing.");
    process.exit(1);
  }

  console.log(`Found ${availableProducts.length} available items with sufficient stock.`);
  console.log(`Launching ${CONCURRENCY} concurrent workers simultaneously...\n`);

  const searchLatencies = [];
  const checkoutLatencies = [];
  let successfulSales = 0;
  let failedSales = 0;

  const startTime = Date.now();

  // Run workers concurrently
  const workers = Array.from({ length: CONCURRENCY }).map(async (_, workerIdx) => {
    for (let i = 0; i < ITERATIONS_PER_USER; i++) {
      const prod = availableProducts[(workerIdx + i) % availableProducts.length];

      // A. Measure POS Product Search
      const tSearch0 = performance.now();
      try {
        const sRes = await fetch(`${BASE_URL}/api/v1/products/pos/search?q=${encodeURIComponent(prod.name.substring(0, 3))}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const tSearch1 = performance.now();
        if (sRes.ok) {
          searchLatencies.push(tSearch1 - tSearch0);
        }
      } catch {
        // network error
      }

      // B. Measure POS Checkout Transaction
      const tSale0 = performance.now();
      try {
        const saleRes = await fetch(`${BASE_URL}/api/v1/sales`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            customer_id: null,
            payment_method: "cash",
            amount_paid: 1000.0,
            notes: `Worker #${workerIdx} sale #${i}`,
            items: [{ product_id: prod.id, qty: 1 }],
          }),
        });
        const tSale1 = performance.now();

        if (saleRes.ok) {
          successfulSales++;
          checkoutLatencies.push(tSale1 - tSale0);
        } else {
          failedSales++;
        }
      } catch {
        failedSales++;
      }
    }
  });

  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const totalRequests = searchLatencies.length + checkoutLatencies.length + failedSales;
  const rps = (totalRequests / totalTimeSec).toFixed(2);

  // Compute stats
  const calcStats = (latencies) => {
    if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };
    const sorted = [...latencies].sort((a, b) => a - b);
    const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    return {
      avg: avg.toFixed(1),
      p50: p50.toFixed(1),
      p95: p95.toFixed(1),
      p99: p99.toFixed(1),
    };
  };

  const searchStats = calcStats(searchLatencies);
  const checkoutStats = calcStats(checkoutLatencies);

  console.log(`\n======================================================`);
  console.log(`                 LOAD TEST RESULTS                     `);
  console.log(`======================================================`);
  console.log(`Total Time:                ${totalTimeSec.toFixed(2)}s`);
  console.log(`Total Completed Sales:     ${successfulSales}`);
  console.log(`Failed Checkout Requests:  ${failedSales} (${((failedSales / (successfulSales + failedSales)) * 100).toFixed(1)}%)`);
  console.log(`Aggregate Throughput:      ${rps} req/sec`);
  console.log(`------------------------------------------------------`);
  console.log(`POS Search Latency (ms):`);
  console.log(`   Avg: ${searchStats.avg}ms | P50: ${searchStats.p50}ms | P95: ${searchStats.p95}ms | P99: ${searchStats.p99}ms`);
  console.log(`------------------------------------------------------`);
  console.log(`POS Checkout Latency (ms):`);
  console.log(`   Avg: ${checkoutStats.avg}ms | P50: ${checkoutStats.p50}ms | P95: ${checkoutStats.p95}ms | P99: ${checkoutStats.p99}ms`);
  console.log(`======================================================\n`);
}

main().catch(console.error);
