// No 0/O/1/I/l — the characters people misread out loud. 32^6 ≈ 1.07 billion
// possible codes, versus 10^6 for a plain 6-digit PIN (DESIGN.md §4 F2).
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function newCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");
}

export function newDriveToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(24))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
