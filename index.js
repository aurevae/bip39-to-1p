#!/usr/bin/env node
import { run } from "./src/gen.js";

try {
  await run();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
