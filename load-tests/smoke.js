import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    "health status 200": (r) => r.status === 200,
    "health response < 200ms": (r) => r.timings.duration < 200,
  });

  // Venue listing
  const venues = http.get(`${BASE_URL}/api/venues?page=1&limit=10`);
  check(venues, {
    "venues status 200": (r) => r.status === 200,
  });

  // Comedian listing
  const comedians = http.get(`${BASE_URL}/api/comedians?page=1&limit=10`);
  check(comedians, {
    "comedians status 200": (r) => r.status === 200,
  });

  // Event listing
  const events = http.get(`${BASE_URL}/api/events?page=1&limit=10`);
  check(events, {
    "events status 200": (r) => r.status === 200,
  });

  // Search
  const search = http.get(`${BASE_URL}/api/search?q=comedy&take=5`);
  check(search, {
    "search status 200": (r) => r.status === 200,
  });

  sleep(1);
}
