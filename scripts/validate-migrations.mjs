import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function validateMigrationLayout(sqlFiles, journal) {
  const errors = [];
  const sortedFiles = [...sqlFiles].sort();
  const uniqueFiles = new Set(sortedFiles);

  if (uniqueFiles.size !== sortedFiles.length) {
    errors.push("duplicate SQL migration filename");
  }

  [...uniqueFiles].forEach((file, index) => {
    const expectedPrefix = String(index).padStart(4, "0");
    if (!file.startsWith(`${expectedPrefix}_`)) {
      errors.push(`expected migration number ${expectedPrefix}, found ${file}`);
    }
  });

  const entries = Array.isArray(journal?.entries) ? journal.entries : [];
  const journalTags = new Set();
  entries.forEach((entry, index) => {
    if (entry.idx !== index) {
      errors.push(`journal idx ${index} is ${String(entry.idx)}`);
    }
    if (journalTags.has(entry.tag)) {
      errors.push(`duplicate journal migration ${String(entry.tag)}`);
    }
    journalTags.add(entry.tag);
  });

  const sqlTags = new Set([...uniqueFiles].map((file) => file.replace(/\.sql$/, "")));
  for (const tag of journalTags) {
    if (!sqlTags.has(tag)) {
      errors.push(`journal references missing SQL migration ${tag}`);
    }
  }
  for (const tag of sqlTags) {
    if (!journalTags.has(tag)) {
      errors.push(`SQL migration is missing from the journal: ${tag}`);
    }
  }

  return errors;
}

function validateMigrationHistory(repositoryRoot, baseSha) {
  if (!baseSha || /^0+$/.test(baseSha)) return [];

  try {
    execFileSync("git", ["cat-file", "-e", `${baseSha}^{commit}`], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
  } catch {
    return [`cannot inspect migration history because base commit ${baseSha} is unavailable`];
  }

  const output = execFileSync(
    "git",
    ["diff", "--name-status", baseSha, "HEAD", "--", "drizzle/migrations/*.sql"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .filter((line) => !line.startsWith("A\t"))
    .map((line) => `applied migrations are immutable; add a new migration instead: ${line}`);
}

function run() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = resolve(scriptDirectory, "..");
  const migrationsDirectory = resolve(repositoryRoot, "drizzle/migrations");
  const sqlFiles = readdirSync(migrationsDirectory).filter((file) => file.endsWith(".sql"));
  const journal = JSON.parse(
    readFileSync(resolve(migrationsDirectory, "meta/_journal.json"), "utf8"),
  );
  const baseArgument = process.argv.indexOf("--base");
  const baseSha = baseArgument >= 0 ? process.argv[baseArgument + 1] : undefined;
  const errors = [
    ...validateMigrationLayout(sqlFiles, journal),
    ...validateMigrationHistory(repositoryRoot, baseSha),
  ];

  if (errors.length > 0) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${sqlFiles.length} sequential D1 migrations.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run();
}
