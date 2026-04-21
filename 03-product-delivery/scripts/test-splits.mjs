#!/usr/bin/env node
/**
 * Standalone test for split-calculator.
 *
 * Validates that:
 *  - restaurant shares sum to (100 - PLATFORM_FEE_PERCENT)% of the per-restaurant subtotal
 *  - split account_id is the restaurant's pj_cnpj (the identifier ECP Pay uses for destination)
 *  - pix_key is propagated
 *  - platform receives exactly the remainder (order.total - sum(restaurant shares))
 *  - multi-restaurant orders split correctly per vendor
 *
 * Run with: `node scripts/test-splits.mjs`
 */

import { initDb, closeDb } from '../server/database.mjs';
import { calculateOrderSplits } from '../server/services/split-calculator.mjs';

let failed = 0;
let passed = 0;

function assertEq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
    console.log(`      actual  : ${JSON.stringify(actual)}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
  }
}

function assertTrue(label, value) {
  if (value) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label} (value=${value})`);
  }
}

const db = initDb();

console.log('');
console.log('=== Test 1: single-restaurant order, no delivery-free threshold ===');
{
  const order = { total: 50.00 };
  const orderItems = [
    { restaurant_id: 'rest_pasta', restaurant_name: 'Pasta & Fogo', item_price: 25.00, quantity: 2 },
  ];
  const splits = calculateOrderSplits(order, orderItems, db);

  // expected: one restaurant split (85% of 5000 cents = 4250) + platform (remainder = 750)
  assertEq('splits length', splits.length, 2);
  const restSplit = splits.find(s => s.account_id !== 'ecp-food-platform');
  const platformSplit = splits.find(s => s.account_id === 'ecp-food-platform');
  assertTrue('restaurant split uses pj_cnpj as account_id', /^\d{14}$/.test(restSplit.account_id));
  assertTrue('restaurant split has pix_key', !!restSplit.pix_key && restSplit.pix_key.length > 0);
  assertEq('restaurant gets 85% of subtotal (cents)', restSplit.amount, 4250);
  assertEq('platform gets remainder (cents)', platformSplit.amount, 5000 - 4250);
  assertEq('sum of splits equals order total (cents)',
    restSplit.amount + platformSplit.amount, 5000);
}

console.log('');
console.log('=== Test 2: multi-restaurant order — each vendor gets their share ===');
{
  const order = { total: 100.00 };
  const orderItems = [
    { restaurant_id: 'rest_pasta', restaurant_name: 'Pasta & Fogo', item_price: 30.00, quantity: 1 },
    { restaurant_id: 'rest_sushi', restaurant_name: 'Sushi Wave',   item_price: 35.00, quantity: 2 },
  ];
  const splits = calculateOrderSplits(order, orderItems, db);

  // pasta subtotal: 3000 cents -> 2550 (85%); sushi: 7000 cents -> 5950 (85%)
  // platform: 10000 - 2550 - 5950 = 1500
  assertEq('splits length', splits.length, 3);
  const pasta = splits.find(s => s.account_name === 'Pasta & Fogo');
  const sushi = splits.find(s => s.account_name === 'Sushi Wave');
  const platform = splits.find(s => s.account_id === 'ecp-food-platform');
  assertEq('pasta share (cents)', pasta.amount, 2550);
  assertEq('sushi share (cents)', sushi.amount, 5950);
  assertEq('platform share (cents)', platform.amount, 1500);
  assertTrue('all restaurant splits carry pix_key', !!pasta.pix_key && !!sushi.pix_key);
  // pj_cnpj uniqueness — destination is deterministic per restaurant
  assertTrue('pasta.account_id !== sushi.account_id', pasta.account_id !== sushi.account_id);
}

console.log('');
console.log('=== Test 3: restaurant without pj_cnpj is silently skipped (defensive) ===');
{
  const order = { total: 20.00 };
  const orderItems = [
    // Fake restaurant id that does not exist in DB — should be skipped from splits array
    { restaurant_id: 'rest_ghost', restaurant_name: 'Ghost', item_price: 20.00, quantity: 1 },
  ];
  const splits = calculateOrderSplits(order, orderItems, db);
  // Only platform split remains; restaurant share is effectively 0 (nothing added)
  assertEq('only platform split', splits.length, 1);
  assertEq('platform gets full order total when restaurant missing', splits[0].amount, 2000);
}

console.log('');
console.log(`Result: ${passed} passed, ${failed} failed.`);
closeDb();
process.exit(failed === 0 ? 0 : 1);
