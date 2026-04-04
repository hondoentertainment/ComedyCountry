# Load Testing

Uses [k6](https://k6.io) for load testing key API endpoints.

## Setup

```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Run Tests

```bash
# Run all load tests against local dev server
npm run dev  # In one terminal
k6 run load-tests/smoke.js         # Quick smoke test (10 VUs, 30s)
k6 run load-tests/load.js          # Standard load test (50 VUs, 5min)
k6 run load-tests/stress.js        # Stress test (ramp to 200 VUs)
```

## Test Profiles

| Profile     | VUs    | Duration | Purpose                                      |
| ----------- | ------ | -------- | -------------------------------------------- |
| `smoke.js`  | 10     | 30s      | Verify endpoints work under minimal load     |
| `load.js`   | 50     | 5 min    | Validate normal traffic patterns             |
| `stress.js` | 10→200 | 10 min   | Find breaking points and rate limit behavior |
