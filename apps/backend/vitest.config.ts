import { defineConfig } from "vitest/config";

// runs before test modules load — src/auth.ts reads AUTH_SECRET at import time
process.env.AUTH_SECRET ??= "test-secret-for-vitest";

export default {};
