type SmokeCheck = {
  path: string;
  expectedStatus: number;
};

function normalizeBaseUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

async function run() {
  const input = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? process.env.NEXTAUTH_URL;

  if (!input) {
    console.error(
      "[smoke] Provide a base URL as the first argument or set SMOKE_BASE_URL/NEXTAUTH_URL."
    );
    process.exit(1);
  }

  const baseUrl = normalizeBaseUrl(input).replace(/\/+$/, "");
  const checks: SmokeCheck[] = [
    { path: "/", expectedStatus: 200 },
    { path: "/schedule", expectedStatus: 200 },
    { path: "/api/health", expectedStatus: 200 },
    { path: "/api/health/ready", expectedStatus: 200 },
  ];

  let hasFailure = false;

  for (const check of checks) {
    const response = await fetch(`${baseUrl}${check.path}`, {
      redirect: "manual",
      headers: {
        "user-agent": "punchline-atlas-smoke-check",
      },
    });

    console.log(`[smoke] ${check.path} -> ${response.status}`);

    if (response.status !== check.expectedStatus) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("[smoke] Post-deploy smoke test failed.");
  console.error(error);
  process.exit(1);
});
