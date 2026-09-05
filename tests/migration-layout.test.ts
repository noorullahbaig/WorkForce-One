import { describe, expect, it } from "vitest";
import { validateMigrationLayout } from "../scripts/validate-migrations.mjs";

describe("D1 migration layout", () => {
  it("accepts sequential SQL files that match the Drizzle journal", () => {
    expect(
      validateMigrationLayout(
        ["0000_initial.sql", "0001_people.sql"],
        { entries: [{ idx: 0, tag: "0000_initial" }, { idx: 1, tag: "0001_people" }] },
      ),
    ).toEqual([]);
  });

  it("reports missing, untracked, duplicate, and out-of-order migrations", () => {
    const errors = validateMigrationLayout(
      ["0000_initial.sql", "0002_extra.sql", "0002_extra.sql"],
      { entries: [{ idx: 1, tag: "0000_initial" }, { idx: 1, tag: "0001_people" }] },
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("duplicate SQL migration"),
        expect.stringContaining("expected migration number 0001"),
        expect.stringContaining("journal idx 0"),
        expect.stringContaining("journal references missing SQL migration 0001_people"),
        expect.stringContaining("SQL migration is missing from the journal: 0002_extra"),
      ]),
    );
  });
});
