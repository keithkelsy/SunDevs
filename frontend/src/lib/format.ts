/** Format integer cents to dollar string: 899 → "$8.99" */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format ISO timestamp to readable time: "2:34:15 PM" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Human-readable event type: ORDER_PLACED → "Order Placed" */
export function formatEventType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/** Shorten an ID for display: "69ac6266a9f4..." → "#69ac62" */
export function shortId(id: string): string {
  return `#${id.slice(0, 6)}`;
}
