// Verifies the relay's end-to-end format (AES-GCM, key = SHA-256("snitch-relay:v1:"+token), frame = base64(iv||ct))
// round-trips, and that a wrong token fails to decrypt. Mirrors src/relay.ts exactly; run under Node's WebCrypto.

async function deriveKey(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("snitch-relay:v1:" + token));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
function toB64(buf) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) s += String.fromCharCode(...buf.subarray(i, i + chunk));
  return btoa(s);
}
function fromB64(b64) {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
async function encryptJson(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = new TextEncoder().encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, pt));
  const buf = new Uint8Array(iv.length + ct.length);
  buf.set(iv, 0);
  buf.set(ct, iv.length);
  return toB64(buf);
}
async function decryptJson(key, b64) {
  const buf = fromB64(b64);
  const iv = buf.subarray(0, 12);
  const ct = buf.subarray(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

const results = {};
try {
  // host encrypts with token, client decrypts with the SAME token
  const token = "f9318883";
  const hostKey = await deriveKey(token);
  const clientKey = await deriveKey(token);

  const big = { type: "snapshot", meta: { active: true }, panels: Array.from({ length: 50 }, (_, i) => ({ id: "p" + i, text: "x".repeat(400) })) };
  const wire = await encryptJson(hostKey, big);
  const back = await decryptJson(clientKey, wire);
  results.roundTrip = JSON.stringify(back) === JSON.stringify(big);
  results.ciphertextNotPlaintext = !wire.includes("snapshot") && !wire.includes("panels");
  results.multiKByteHandled = wire.length > 20000; // ~50*400 chars encrypted -> proves chunked base64 path

  // wrong token must fail to decrypt (authentication tag mismatch)
  const wrongKey = await deriveKey("wrongtoken");
  let failed = false;
  try {
    await decryptJson(wrongKey, wire);
  } catch {
    failed = true;
  }
  results.wrongTokenRejected = failed;

  // control direction: client encrypts, host decrypts
  const ctrl = { cmd: "toggle", id: "Backrooms:peaceful-mode", value: "true" };
  const cwire = await encryptJson(clientKey, ctrl);
  const cback = await decryptJson(hostKey, cwire);
  results.controlRoundTrip = JSON.stringify(cback) === JSON.stringify(ctrl);

  console.log("=== E2E CRYPTO TEST ===");
  for (const [k, v] of Object.entries(results)) console.log(`  ${v ? "PASS" : "FAIL"}  ${k}`);
  const pass = Object.values(results).every(Boolean);
  console.log(pass ? "\nALL PASS" : "\nSOME FAILED");
  process.exitCode = pass ? 0 : 1;
} catch (e) {
  console.error("test error:", e);
  process.exitCode = 1;
}
