import { dateKey, formatDate, isDateKey } from './format';

export interface ReorderLine {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

const cleanLabel = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

/** A recipient-free enquiry. The user chooses a verified contact in WhatsApp. */
export function buildReorderMessage(lines: ReorderLine[], requestedOn = dateKey()): string {
  if (!isDateKey(requestedOn)) throw new Error('Please use a valid enquiry date.');
  if (lines.length === 0) throw new Error('Select at least one product for your enquiry.');
  if (new Set(lines.map((line) => line.id)).size !== lines.length) {
    throw new Error('Each product can appear only once in an enquiry.');
  }
  const products = lines.map((line, index) => {
    if (!line.id.trim() || !cleanLabel(line.name) || !cleanLabel(line.unit)) {
      throw new Error('Each product needs a name and unit.');
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new Error(`Enter a quantity greater than zero for ${cleanLabel(line.name)}.`);
    }
    return `${index + 1}. ${cleanLabel(line.name)} — ${line.quantity} ${cleanLabel(line.unit)}`;
  });
  return [
    'Hello Aura Tradings,',
    `Housekeeping supplies enquiry • ${formatDate(requestedOn)} (IST)`,
    '',
    'Please share availability, pricing and delivery details for:',
    ...products,
    '',
    'Please confirm the quotation before processing an order.',
    'Prepared with CleanOS — Smart Housekeeping Management.',
  ].join('\n');
}

export function buildWhatsAppReorderUrl(lines: ReorderLine[], requestedOn = dateKey()): string {
  return `https://wa.me/?text=${encodeURIComponent(buildReorderMessage(lines, requestedOn))}`;
}
