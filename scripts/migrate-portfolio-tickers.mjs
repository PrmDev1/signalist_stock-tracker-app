import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '8.8.8.8']);

import 'dotenv/config';
import mongoose from 'mongoose';

const isDryRun = process.argv.includes('--dry-run');

function normalizeTickers(tickers) {
  if (!Array.isArray(tickers)) return [];

  const seen = new Set();
  const normalized = [];

  for (const ticker of tickers) {
    const value = String(ticker || '').trim().toUpperCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

function getTickersFromAllocations(allocations) {
  if (!allocations || typeof allocations !== 'object') return [];

  const allocationKeys = Object.keys(allocations);
  return normalizeTickers(allocationKeys);
}

function areSameArray(a, b) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI must be set in .env');
    process.exit(1);
  }

  const startedAt = Date.now();

  try {
    await mongoose.connect(uri, { bufferCommands: false });

    const collection = mongoose.connection.collection('portfolios');
    const cursor = collection.find({}, { projection: { tickers: 1, allocations: 1 } });

    let scanned = 0;
    let candidates = 0;
    let updated = 0;

    const bulkOps = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      scanned += 1;

      const currentTickers = normalizeTickers(doc.tickers || []);
      const allocationTickers = getTickersFromAllocations(doc.allocations);

      if (allocationTickers.length === 0) {
        continue;
      }

      if (areSameArray(currentTickers, allocationTickers)) {
        continue;
      }

      candidates += 1;

      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { tickers: allocationTickers } },
        },
      });

      if (bulkOps.length >= 500) {
        if (!isDryRun) {
          const result = await collection.bulkWrite(bulkOps, { ordered: false });
          updated += result.modifiedCount || 0;
        }
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0 && !isDryRun) {
      const result = await collection.bulkWrite(bulkOps, { ordered: false });
      updated += result.modifiedCount || 0;
    }

    const elapsed = Date.now() - startedAt;

    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY CHANGES'}`);
    console.log(`Scanned records: ${scanned}`);
    console.log(`Migration candidates: ${candidates}`);
    console.log(`Updated records: ${isDryRun ? 0 : updated}`);
    console.log(`Done in ${elapsed}ms`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Migration failed');
    console.error(error);
    try {
      await mongoose.connection.close();
    } catch {}
    process.exit(1);
  }
}

main();
