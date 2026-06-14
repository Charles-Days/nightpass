#!/usr/bin/env node
// Genera secretos random (hex 32 bytes) para los .env.
// Uso:
//   node scripts/gen-secrets.mjs            -> imprime todos
//   node scripts/gen-secrets.mjs STORY_CARD_SECRET   -> solo ese
import { randomBytes } from 'node:crypto';

const ALL = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'STORY_CARD_SECRET',
  'PASS_HMAC_SECRET',
];

const gen = () => randomBytes(32).toString('hex');
const keys = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

console.log(`# secrets ${new Date().toISOString().slice(0, 10)}`);
for (const k of keys) console.log(`${k}=${gen()}`);
