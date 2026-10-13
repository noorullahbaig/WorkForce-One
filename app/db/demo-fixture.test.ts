import { expect, test } from "vitest";
import { testDatabase } from "../../tests/helpers/database";
import { demoBusinessFixture } from "./demo-fixture";

test("canonical business fixture matches every seeded business row and column", async () => {
 const { db, dispose } = await testDatabase();
 try {
  for (const [table, expected] of Object.entries(demoBusinessFixture)) {
   const actual = (await db.prepare(`SELECT * FROM ${table}`).all()).results;
   expect(actual, table).toEqual(expected);
  }
 } finally { await dispose(); }
}, 30000);
