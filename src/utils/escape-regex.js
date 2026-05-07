/** Escape user input used inside a MongoDB `$regex` (partial match). */
export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
