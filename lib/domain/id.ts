/**
 * Local identifiers. These are never authorization: the server derives the
 * owner from the session, so an id only needs to be unique and stable.
 */

const HEX = Array.from({ length: 256 }, (_, value) => value.toString(16).padStart(2, "0"));

/**
 * RFC 4122 v4. `crypto.randomUUID` only exists in secure contexts, and the
 * project supports LAN development over plain HTTP, so keep a fallback.
 */
export function newOperationId(): string {
  const api = typeof crypto === "undefined" ? undefined : crypto;
  if (api && typeof api.randomUUID === "function") return api.randomUUID();
  const bytes = new Uint8Array(16);
  if (api && typeof api.getRandomValues === "function") {
    api.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => HEX[byte]).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A transient local database name that is never opened or synced. */
export function newLockedSpaceName(): string {
  return `runo-locked-${newOperationId()}`;
}

/**
 * Deterministic, non-cryptographic digest (two FNV-1a passes) used to derive
 * stable local ids for an import. Being pure keeps the result identical on
 * HTTPS and on insecure LAN origins, where crypto.subtle is unavailable.
 */
export function stableDigest(value: string): string {
  const pass = (seed: number): string => {
    let hash = seed >>> 0;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index) & 0xff;
      hash = Math.imul(hash, 0x01000193) >>> 0;
      hash ^= value.charCodeAt(index) >>> 8;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  };
  return [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35].map(pass).join("");
}
