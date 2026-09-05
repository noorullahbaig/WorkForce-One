import { describe, expect, it } from "vitest";
import { getDatabaseHealth } from "./health";

describe("database health", () => {
  it("reports the Worker unhealthy while the required migration or table is missing", async () => {
    const db = {
      prepare(_sql: string) {
        const result = null;
        return {
          bind() {
            return {
              first: async () => result,
            };
          },
          first: async () => result,
        };
      },
    } as unknown as D1Database;

    expect(await getDatabaseHealth(db)).toEqual({
      ok: false,
      migration: "pending",
      holidaysTable: "missing",
      leaveBackdate: "present",
      attendanceCorrections: "missing",
    });
  });

  it("reports the Worker healthy only when the required migration and table exist", async () => {
    const db = {
      prepare(sql: string) {
        const result = sql.includes("d1_migrations")
          ? { applied: 1 }
          : { present: 1 };
        return {
          bind() {
            return {
              first: async () => result,
            };
          },
          first: async () => result,
        };
      },
    } as unknown as D1Database;

    expect(await getDatabaseHealth(db)).toEqual({
      ok: true,
      migration: "applied",
      holidaysTable: "present",
      leaveBackdate: "present",
      attendanceCorrections: "present",
    });
  });
});
