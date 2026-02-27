/**
 * scripts/ebayCreateListingPreviews.ts
 *
 * CLI helper that takes a JSON file of VinylFort records and generates
 * eBay Listing Previews via the Inventory Mapping API.
 *
 * Usage:
 *   npx ts-node scripts/ebayCreateListingPreviews.ts records.json [--out previews.json]
 *
 * Environment variables required (see .env.example):
 *   EBAY_ACCESS_TOKEN  – user access token with sell.inventory.mapping scope
 *
 * Notes:
 *   - Production only (Sandbox not supported by this API).
 *   - US marketplace only (EBAY_US).
 *   - Maximum 10 products per task; records are automatically chunked.
 *   - Each preview result includes a mappingReferenceId that should be stored
 *     alongside your internal SKU for subsequent listing calls.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  toExternalProduct,
  startListingPreviews,
  getListingPreviewsTask,
  type VinylFortRecord,
  type ListingPreview,
  type EbayGraphQLClientOptions,
} from "../src/ebay/inventoryMapping";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 3_000;  // 3 s between polls
const MAX_POLL_ATTEMPTS = 20;    // give up after 60 s per chunk
const CHUNK_SIZE = 10;           // eBay max per task

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadAccessToken(): string {
  const token = process.env["EBAY_ACCESS_TOKEN"];
  if (!token) {
    console.error(
      "Error: EBAY_ACCESS_TOKEN environment variable is not set.\n" +
        "Obtain a user access token with scope https://api.ebay.com/oauth/api_scope/sell.inventory.mapping",
    );
    process.exit(1);
  }
  return token;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntilComplete(
  taskId: string,
  options: EbayGraphQLClientOptions,
): Promise<ListingPreview[]> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const task = await getListingPreviewsTask(taskId, options);
    console.log(`  Poll ${attempt + 1}/${MAX_POLL_ATTEMPTS}: status=${task.completionStatus}`);

    if (task.completionStatus === "COMPLETED") {
      return task.listingPreviews ?? [];
    }

    if (task.completionStatus === "FAILED") {
      throw new Error(`Task ${taskId} failed`);
    }
  }

  throw new Error(`Task ${taskId} did not complete after ${MAX_POLL_ATTEMPTS} polls`);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputPath = args[0];
  const outFlagIndex = args.indexOf("--out");
  const outputPath = outFlagIndex >= 0 ? args[outFlagIndex + 1] : "previews.json";

  if (!inputPath) {
    console.error("Usage: npx ts-node scripts/ebayCreateListingPreviews.ts <records.json> [--out previews.json]");
    process.exit(1);
  }

  const accessToken = loadAccessToken();
  const options: EbayGraphQLClientOptions = { accessToken };

  // Load records
  const raw = readFileSync(resolve(inputPath), "utf8");
  const records: VinylFortRecord[] = JSON.parse(raw) as VinylFortRecord[];
  console.log(`Loaded ${records.length} record(s) from ${inputPath}`);

  // Convert to eBay external products, assigning SKUs if missing
  const externalProducts = records.map((record, idx) => {
    const sku = record.sku ?? `vinylfort-${idx + 1}`;
    return toExternalProduct({ ...record, sku }, sku);
  });

  // Process in chunks of 10 (eBay API limit)
  const chunks = chunk(externalProducts, CHUNK_SIZE);
  const allPreviews: ListingPreview[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkItems = chunks[i];
    if (!chunkItems) continue;
    console.log(`\nChunk ${i + 1}/${chunks.length}: starting preview task for ${chunkItems.length} item(s)…`);

    const taskId = await startListingPreviews(chunkItems, options);
    console.log(`  Task started: ${taskId}`);

    const previews = await pollUntilComplete(taskId, options);
    console.log(`  Received ${previews.length} preview(s)`);
    allPreviews.push(...previews);
  }

  // Write output
  const resolvedOutput = resolve(outputPath ?? "previews.json");
  writeFileSync(resolvedOutput, JSON.stringify(allPreviews, null, 2), "utf8");
  console.log(`\nWrote ${allPreviews.length} preview(s) to ${resolvedOutput}`);

  // Print summary with mappingReferenceIds for audit
  console.log("\nSummary (store mappingReferenceId alongside each SKU):");
  for (const p of allPreviews) {
    console.log(`  ${p.sku} → mappingReferenceId=${p.mappingReferenceId}  category=${p.category?.id ?? "?"}`);
  }
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
