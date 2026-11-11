import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "15s", target: 20 },
    { duration: "30s", target: 50 },
    { duration: "15s", target: 50 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete below 500ms
    http_req_failed: ["rate<0.01"],   // Error rate less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000";

export default function () {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // 1. Authenticate as Cashier
  const loginRes = http.post(
    `${BASE_URL}/api/v1/login`,
    JSON.stringify({
      email: "cashier@inventory.test",
      password: "Password123!",
    }),
    { headers }
  );

  check(loginRes, {
    "login status 200": (r) => r.status === 200,
  });

  const token = loginRes.json("token");
  const authHeaders = {
    ...headers,
    Authorization: `Bearer ${token}`,
  };

  // 2. POS Search
  const searchRes = http.get(
    `${BASE_URL}/api/v1/products/pos/search?q=Item`,
    { headers: authHeaders }
  );

  check(searchRes, {
    "search status 200": (r) => r.status === 200,
  });

  const products = searchRes.json("data");
  if (products && products.length > 0) {
    const targetProduct = products[0];

    // 3. POS Checkout
    const salePayload = JSON.stringify({
      customer_id: null,
      payment_method: "cash",
      amount_paid: 1000.0,
      notes: "k6 concurrent benchmark sale",
      items: [
        {
          product_id: targetProduct.id,
          qty: 1,
        },
      ],
    });

    const saleRes = http.post(`${BASE_URL}/api/v1/sales`, salePayload, {
      headers: authHeaders,
    });

    check(saleRes, {
      "sale created 201": (r) => r.status === 201,
    });
  }

  sleep(0.5);
}
