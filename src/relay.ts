// Cross-network transport: pair a desktop "host" and a phone "client" through the relay at /relay, and
// end-to-end encrypt every payload with the pairing token so the relay only ever forwards ciphertext (the
// token travels in the QR, never to the server). AES-GCM via WebCrypto; both sides run in a secure context
// (the hosted HTTPS page), so subtle crypto is available.

// The relay is a standalone, app-namespaced service (any DooDesch app can use it); Snitch is just one consumer.
const RELAY_URL = "wss://relay.doodesch.de";
const RELAY_APP = "snitch";

/** The origin the phone must load for the relay (always the hosted HTTPS site, reachable from any network). */
export const HOSTED_ORIGIN = "https://snitch.doodesch.de";

/** Relay WebSocket URL for this app's namespace. */
export function relayWsUrl(role: "host" | "client", code: string): string {
  return `${RELAY_URL}/?app=${RELAY_APP}&role=${role}&code=${encodeURIComponent(code)}`;
}

/** A random URL-safe pairing code the relay uses to match a host and its phones. */
export function newPairingCode(): string {
  const b = new Uint8Array(9);
  crypto.getRandomValues(b);
  return toB64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ----- end-to-end encryption (AES-GCM, key = SHA-256 of the pairing token) -----

// Cast helper: newer lib.dom types Uint8Array as Uint8Array<ArrayBufferLike>, which doesn't structurally match
// BufferSource; the runtime value is always a valid BufferSource.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

async function deriveKey(token: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", bs(new TextEncoder().encode("snitch-relay:v1:" + token)));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptJson(key: CryptoKey, obj: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = new TextEncoder().encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(iv) }, key, bs(pt)));
  const buf = new Uint8Array(iv.length + ct.length);
  buf.set(iv, 0);
  buf.set(ct, iv.length);
  return toB64(buf);
}

async function decryptJson(key: CryptoKey, b64: string): Promise<unknown> {
  const buf = fromB64(b64);
  const iv = buf.subarray(0, 12);
  const ct = buf.subarray(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bs(iv) }, key, bs(ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

// Chunked base64 so a multi-KB snapshot ciphertext never blows the argument limit of String.fromCharCode.
function toB64(buf: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) s += String.fromCharCode(...buf.subarray(i, i + chunk));
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

// ----- relay socket wrapper -----

export type RelayEvent = "open" | "close" | "ready" | "join" | "leave" | "nohost";

export interface RelayOpts {
  role: "host" | "client";
  code: string;
  token: string;
  /** A decrypted peer payload arrived. */
  onData: (obj: unknown) => void;
  /** Relay/connection signalling. `n` is the current client count for join/leave. */
  onEvent?: (ev: RelayEvent, n?: number) => void;
}

export interface RelayHandle {
  /** Encrypt and send a payload to the peer(s). Best-effort; dropped if not connected. */
  send: (obj: unknown) => void;
  close: () => void;
  isOpen: () => boolean;
}

/** Open a relay connection with auto-reconnect. Frames tagged "__relay" are signalling; everything else is a
 * peer data frame carrying `{ d: <ciphertext> }` which is decrypted before onData. */
export function openRelay(opts: RelayOpts): RelayHandle {
  const keyPromise = deriveKey(opts.token);
  let ws: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let open = false;

  const connect = () => {
    if (closed) return;
    try {
      ws = new WebSocket(relayWsUrl(opts.role, opts.code));
    } catch {
      retry = setTimeout(connect, 2000);
      return;
    }
    ws.onopen = () => {
      open = true;
      opts.onEvent?.("open");
    };
    ws.onmessage = (e) => {
      let text: string;
      if (typeof e.data === "string") text = e.data;
      else return;
      let msg: any;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }
      if (msg && typeof msg.__relay === "string") {
        opts.onEvent?.(msg.__relay as RelayEvent, msg.n);
        return;
      }
      if (msg && typeof msg.d === "string") {
        keyPromise
          .then((k) => decryptJson(k, msg.d))
          .then((obj) => opts.onData(obj))
          .catch(() => {
            /* wrong token or corrupt frame - ignore */
          });
      }
    };
    ws.onclose = () => {
      open = false;
      opts.onEvent?.("close");
      if (!closed) retry = setTimeout(connect, 2000);
    };
    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        /* onclose reconnects */
      }
    };
  };

  connect();

  return {
    send: (obj: unknown) => {
      const sock = ws;
      if (!sock || sock.readyState !== WebSocket.OPEN) return;
      keyPromise
        .then((k) => encryptJson(k, obj))
        .then((d) => {
          if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ d }));
        })
        .catch(() => {
          /* drop */
        });
    },
    close: () => {
      closed = true;
      if (retry) clearTimeout(retry);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    },
    isOpen: () => open,
  };
}
