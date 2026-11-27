import { createHash, randomInt } from "crypto";

/** Invite codes skip look-alike characters (0/O, 1/I/L) so they can be read out over the phone. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
export const INVITE_TTL_DAYS = 7;

export function newInviteCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Codes are stored hashed; spaces, dashes and case are ignored when typed back in. */
export function hashInviteCode(code: string) {
  const clean = code.replace(/[\s-]/g, "").toUpperCase();
  return createHash("sha256").update(`dorjee-invite:${clean}`).digest("hex");
}

/**
 * Bangladeshi mobile numbers in one form, 01XXXXXXXXX: drops spaces, dashes and
 * a +88 / 88 prefix. Anything else is returned as bare digits.
 */
export function normalizePhone(raw: string | null | undefined) {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) digits = digits.slice(2);
  return digits;
}

export const BD_MOBILE = /^01[3-9]\d{8}$/;
