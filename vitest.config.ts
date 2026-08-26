import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: { reporter: ["text", "html"] },
		include: ["app/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
		setupFiles: ["./tests/setup.ts"],
	},
});
