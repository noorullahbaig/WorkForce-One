import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";

export async function testDatabase() {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "test",
          modules: true,
          script: 'export default {fetch(){return new Response("ok")}}',
          compatibilityDate: "2026-08-26",
          d1Databases: ["DB"],
        },
      ],
    }),
  );
  const db = await mf.getD1Database("DB");
  for (const name of readdirSync("drizzle/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(`drizzle/migrations/${name}`, "utf8");
    for (const statement of sql
      .split(";")
      .map((s) => s.replaceAll("--> statement-breakpoint", "").trim())
      .filter(Boolean))
      await db.prepare(statement).run();
  }
  const seed = readFileSync("drizzle/seed.sql", "utf8");
  for (const statement of seed
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(statement).run();
  return { db: db as unknown as D1Database, dispose: () => mf.dispose() };
}
