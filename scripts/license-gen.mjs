#!/usr/bin/env node
// MizanNet lisans kodu üretici aracı (satıcı tarafı)
//
// Kullanım:
//   node scripts/license-gen.mjs keygen
//       -> Ed25519 anahtar çifti üretir (scripts/license-keys/ altına).
//          Genel anahtarı uygulama kaynağına (license.rs) gömmek için ekrana basar.
//   node scripts/license-gen.mjs generate --plan monthly|yearly --holder "Firma Adı" [--months N] [--years N]
//       -> Lisans kodu üretir. --months/--years verilmezse plana göre 1 ay / 1 yıl.
//   node scripts/license-gen.mjs verify <kod>
//       -> Üretilmiş bir kodu doğrular (test amaçlı).
//
// ÖNEMLİ: scripts/license-keys/private.pem dosyası gizlidir. Yedekleyin ve
// kimseyle paylaşmayın. Kaybolursa yeni lisans üretemezsiniz; sızarsa
// herkes kendi lisansını üretebilir.

import {
  generateKeyPairSync,
  createPublicKey,
  createPrivateKey,
  sign,
  verify,
} from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_DIR = join(__dirname, "license-keys");
const PRIVATE_KEY_PATH = join(KEYS_DIR, "private.pem");
const PUBLIC_KEY_PATH = join(KEYS_DIR, "public.pem");
const PREFIX = "MIZANNET";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function normalizeCode(code) {
  const cleaned = code.trim().replace(/\s+/g, "");
  let body = cleaned.toUpperCase().startsWith(PREFIX)
    ? cleaned.slice(PREFIX.length)
    : cleaned;
  if (body.startsWith("-")) body = body.slice(1);
  return body;
}

function keygen() {
  mkdirSync(KEYS_DIR, { recursive: true });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  writeFileSync(
    PRIVATE_KEY_PATH,
    privateKey.export({ type: "pkcs8", format: "pem" })
  );
  writeFileSync(
    PUBLIC_KEY_PATH,
    publicKey.export({ type: "spki", format: "pem" })
  );
  const rawB64 = publicKey.export({ format: "jwk" }).x;
  const rawBytes = Buffer.from(rawB64, "base64url");
  const arr = Array.from(rawBytes)
    .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
    .join(", ");
  console.log("Anahtar çifti oluşturuldu:");
  console.log(`  Özel anahtar : ${PRIVATE_KEY_PATH} (SAKLAYIN, paylaşmayın!)`);
  console.log(`  Genel anahtar: ${PUBLIC_KEY_PATH}`);
  console.log("");
  console.log("license.rs icin PUBLIC_KEY (kopyala-yapistir):");
  console.log(`[${arr}]`);
  console.log("");
  console.log("Hex: " + rawBytes.toString("hex"));
}

function generate({ plan, holder, months, years }) {
  if (!existsSync(PRIVATE_KEY_PATH)) {
    console.error(
      "Özel anahtar bulunamadı. Önce: node scripts/license-gen.mjs keygen"
    );
    process.exit(1);
  }
  if (!["monthly", "yearly"].includes(plan)) {
    console.error('--plan değeri "monthly" veya "yearly" olmalı.');
    process.exit(1);
  }
  const privateKey = createPrivateKey(readFileSync(PRIVATE_KEY_PATH));
  const now = new Date();
  const exp = new Date(now);
  if (months) exp.setMonth(exp.getMonth() + months);
  if (years) exp.setFullYear(exp.getFullYear() + years);
  if (!months && !years) {
    if (plan === "monthly") exp.setMonth(exp.getMonth() + 1);
    else exp.setFullYear(exp.getFullYear() + 1);
  }
  const payload = {
    v: 1,
    sub: holder || "MizanNet Kullanıcısı",
    plan,
    iat: now.toISOString(),
    exp: exp.toISOString(),
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = sign(null, Buffer.from(payloadB64), privateKey);
  const code = `${PREFIX}-${payloadB64}.${b64url(sig)}`;
  console.log("Lisans kodu:");
  console.log(code);
  console.log("");
  console.log(`  Kullanıcı : ${payload.sub}`);
  console.log(`  Plan      : ${plan === "monthly" ? "Aylık" : "Yıllık"}`);
  console.log(`  Başlangıç : ${payload.iat}`);
  console.log(`  Bitiş     : ${payload.exp}`);
}

function verifyCode(code) {
  if (!existsSync(PUBLIC_KEY_PATH)) {
    console.error("Genel anahtar bulunamadı.");
    process.exit(1);
  }
  const publicKey = createPublicKey(readFileSync(PUBLIC_KEY_PATH));
  const body = normalizeCode(code);
  const dot = body.indexOf(".");
  if (dot < 0) {
    console.error("Geçersiz format");
    process.exit(1);
  }
  const payloadB64 = body.slice(0, dot);
  const sigB64 = body.slice(dot + 1);
  const ok = verify(
    null,
    Buffer.from(payloadB64),
    publicKey,
    Buffer.from(sigB64, "base64url")
  );
  if (!ok) {
    console.error("İmza geçersiz!");
    process.exit(1);
  }
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  console.log("Kod geçerli:", JSON.stringify(payload, null, 2));
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "keygen") {
  keygen();
} else if (cmd === "generate") {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--plan") opts.plan = args[++i];
    else if (args[i] === "--holder") opts.holder = args[++i];
    else if (args[i] === "--months") opts.months = parseInt(args[++i], 10);
    else if (args[i] === "--years") opts.years = parseInt(args[++i], 10);
  }
  generate(opts);
} else if (cmd === "verify") {
  verifyCode(args[0] || "");
} else {
  console.log(
    "Kullanım: node scripts/license-gen.mjs keygen | generate --plan monthly|yearly --holder \"Firma\" | verify <kod>"
  );
  process.exit(1);
}
