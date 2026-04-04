import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "3m", target: 50 },
    { duration: "30s", target: 50 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const endpoints = [
    "/api/health",
    "/api/venues?page=1&limit=10",
    "/api/comedians?page=1&limit=10",
    "/api/events?page=1&limit=10",
    "/api/search?q=comedy&take=5",
    "/api/trending",
    "/api/for-you",
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`);

  check(res, {
    "status is not 5xx": (r) => r.status < 500,
    "response time < 2s": (r) => r.timings.duration < 2000,
  });

  sleep(Math.random() * 2 + 0.5);
}
