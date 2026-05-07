/** Socket.IO event names (company-scoped rooms). */
export const RT_EVENTS = Object.freeze({
  CLIENT_NEW: "client:new",
  PROJECT_NEW: "project:new",
  DELIVERY_NOTE_NEW: "deliverynote:new",
  DELIVERY_NOTE_SIGNED: "deliverynote:signed",
});

/**
 * Emits to everyone in `companyId`'s room (`socket.join(companyId)` on connect).
 * No-op if `io` is unset (e.g. tests import `app` without starting `index.js`).
 */
export function emitToCompany(io, companyId, event, payload) {
  if (!io || companyId == null || companyId === undefined) return;
  io.to(String(companyId)).emit(event, payload);
}
