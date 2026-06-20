import crypto from 'node:crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_INTERVAL = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;

export function generateSecret(length = 20): string {
  const buffer = crypto.randomBytes(length);
  let secret = '';
  let bits = 0;
  let value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      secret += BASE32_CHARS[(value >>> bits) & 31];
    }
  }
  return secret;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    value = (value << 5) | BASE32_CHARS.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % Math.pow(10, TOTP_DIGITS);
  return code.toString().padStart(TOTP_DIGITS, '0');
}

export function generateTOTP(secret: string, time?: number): string {
  const counter = Math.floor((time || Date.now() / 1000) / TOTP_INTERVAL);
  return hotp(secret, counter);
}

export function verifyTOTP(secret: string, token: string, window = TOTP_WINDOW): boolean {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / TOTP_INTERVAL);
  for (let i = -window; i <= window; i++) {
    if (hotp(secret, counter + i) === token) return true;
  }
  return false;
}

export function getTOTPUri(secret: string, email: string, issuer = 'iSchool'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_INTERVAL}`;
}
