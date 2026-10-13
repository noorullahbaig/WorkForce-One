import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
        // D1 fixtures launch workerd processes: bound parallelism to avoid CPU starvation and false timeouts.
        maxWorkers: 2,
		coverage: { reporter: ["text", "html"] },
		include: ["app/**/*.test.{ts,tsx}", "workers/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
		setupFiles: ["./tests/setup.ts"],
	},
});
