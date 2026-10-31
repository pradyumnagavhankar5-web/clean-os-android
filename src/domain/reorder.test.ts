import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReorderMessage, buildWhatsAppReorderUrl, type ReorderLine } from './reorder';

const lines: ReorderLine[] = [
  { id: 'tissues', name: 'Facial tissues', unit: 'boxes', quantity: 12 },
  { id: 'cleaner', name: 'Floor cleaner', unit: 'litres', quantity: 2.5 },
];

test('reorder enquiry includes editable quantities, units and an Indian business date', () => {
  const message = buildReorderMessage(lines, '2026-10-31');
  assert.match(message, /Hello Aura Tradings/);
  assert.match(message, /31 Oct 2026 \(IST\)/);
  assert.match(message, /1\. Facial tissues — 12 boxes/);
  assert.match(message, /2\. Floor cleaner — 2.5 litres/);
  assert.match(message, /confirm the quotation/);
});

test('WhatsApp uses an encoded recipient-free URL and preserves product punctuation', () => {
  const special = [{ id: 'soap', name: 'Handwash & soap (₹)', unit: 'bottles', quantity: 3 }];
  const url = buildWhatsAppReorderUrl(special, '2026-10-31');
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://wa.me');
  assert.equal(parsed.pathname, '/');
  assert.equal(parsed.searchParams.get('text'), buildReorderMessage(special, '2026-10-31'));
});

test('invalid quantities, missing products, duplicates and invalid dates are rejected', () => {
  assert.throws(() => buildReorderMessage([], '2026-10-31'), /Select at least one/);
  for (const quantity of [0, -1, Number.NaN, Infinity]) {
    assert.throws(() => buildReorderMessage([{ ...lines[0], quantity }], '2026-10-31'), /greater than zero/);
  }
  assert.throws(() => buildReorderMessage([lines[0], lines[0]], '2026-10-31'), /only once/);
  assert.throws(() => buildReorderMessage(lines, '2026-02-31'), /valid enquiry date/);
});

test('product labels cannot inject extra lines into the enquiry', () => {
  const message = buildReorderMessage([{ ...lines[0], name: 'Tissues\nextra line' }], '2026-10-31');
  assert.match(message, /1\. Tissues extra line — 12 boxes/);
});
