import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./auth.server";

describe("password security", () => {
	it("verifies the seeded PBKDF2-SHA-256 credentials", async () => {
		const hash = await hashPassword("AdminDemo#2026", "workforce-one-admin-2026");
		expect(hash).toBe(
			"e2cd94f453483d4e6bf8452db19cbefaf31032e18793d9cbf4af197954a93f45",
		);
		expect(await verifyPassword("AdminDemo#2026", hash, "workforce-one-admin-2026")).toBe(true);
		expect(await verifyPassword("wrong", hash, "workforce-one-admin-2026")).toBe(false);
	});
});
