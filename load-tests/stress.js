import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 100 },
    { duration: "2m", target: 150 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 200 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.10"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // Mix of read endpoints with varying weight
  const weighted = [
    { url: "/api/venues?page=1&limit=10", weight: 25 },
    { url: "/api/events?page=1&limit=10", weight: 25 },
    { url: "/api/comedians?page=1&limit=10", weight: 15 },
    { url: "/api/search?q=comedy&take=5", weight: 20 },
    { url: "/api/health", weight: 5 },
    { url: "/api/trending", weight: 5 },
    { url: "/api/embed?type=comedian&slug=test", weight: 5 },
  ];

  const totalWeight = weighted.reduce((sum, e) => sum + e.weight, 0);
  let rand = Math.random() * totalWeight;
  let endpoint = weighted[0].url;

  for (const entry of weighted) {
    rand -= entry.weight;
    if (rand <= 0) {
      endpoint = entry.url;
      break;
    }
  }

  const res = http.get(`${BASE_URL}${endpoint}`);

  check(res, {
    "status is not 5xx": (r) => r.status < 500,
  });

  // Track rate limit responses separately
  if (res.status === 429) {
    check(res, {
      "rate limited response has retry-after": (r) =>
        r.headers["Retry-After"] !== undefined || r.body.includes("retry"),
    });
  }

  sleep(Math.random() * 1.5 + 0.3);
}
