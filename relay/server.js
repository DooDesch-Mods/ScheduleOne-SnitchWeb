import http from "http";
import { WebSocketServer } from "ws";

// Snitch relay: a dumb WebSocket message forwarder that lets a phone reach a desktop dashboard when they are
// not on the same network. It pairs a "host" (the desktop tab, already connected to the local game) with one
// or more "clients" (phones) by a random pairing code, and forwards opaque text frames between them - host to
// all clients, each client to the host. It never inspects the payload: the peers end-to-end encrypt everything
// with a token that only travels in the QR (never to this server), so the relay only ever sees ciphertext.
//
// It keeps nothing: rooms live only while a socket is connected. Its own signalling frames are JSON tagged with
// "__relay"; peer data frames are forwarded verbatim.

const PORT = Number(process.env.PORT) || 8080;
const MAX_MSG = 512 * 1024; // ciphertext of one snapshot is a few KB; this is a generous ceiling
const MAX_CLIENTS_PER_CODE = 4;
const MAX_ROOMS = 5000;
const CODE_MAX = 64;

/** code -> { host: WebSocket|null, clients: Set<WebSocket> } */
const rooms = new Map();

function roomOf(code) {
  let r = rooms.get(code);
  if (!r) {
    r = { host: null, clients: new Set() };
    rooms.set(code, r);
  }
  return r;
}
function dropIfEmpty(code) {
  const r = rooms.get(code);
  if (r && !r.host && r.clients.size === 0) rooms.delete(code);
}
function sendCtl(ws, obj) {
  try {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  } catch {
    /* peer gone */
  }
}
function forward(ws, text) {
  try {
    if (ws.readyState === ws.OPEN) ws.send(text);
  } catch {
    /* peer gone */
  }
}

const server = http.createServer((req, res) => {
  // Behind Traefik the /relay path prefix is stripped, so a health probe arrives as /health (or /relay/health).
  if (req.url === "/health" || req.url === "/relay/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(426, { "content-type": "text/plain" });
  res.end("upgrade required");
});

const wss = new WebSocketServer({ server, maxPayload: MAX_MSG });

wss.on("connection", (ws, req) => {
  let url;
  try {
    url = new URL(req.url, "http://relay");
  } catch {
    ws.close(4000, "bad url");
    return;
  }
  const role = url.searchParams.get("role");
  const code = (url.searchParams.get("code") || "").slice(0, CODE_MAX);
  if ((role !== "host" && role !== "client") || !code) {
    ws.close(4000, "bad params");
    return;
  }
  if (!rooms.has(code) && rooms.size >= MAX_ROOMS) {
    ws.close(4003, "busy");
    return;
  }

  ws.isAlive = true;
  ws._role = role;
  ws._code = code;
  const room = roomOf(code);

  if (role === "host") {
    if (room.host && room.host !== ws) {
      try {
        room.host.close(4001, "replaced");
      } catch {
        /* ignore */
      }
    }
    room.host = ws;
    sendCtl(ws, { __relay: "ready" });
    if (room.clients.size > 0) sendCtl(ws, { __relay: "join", n: room.clients.size });
  } else {
    if (room.clients.size >= MAX_CLIENTS_PER_CODE) {
      ws.close(4002, "full");
      return;
    }
    room.clients.add(ws);
    if (room.host) {
      sendCtl(ws, { __relay: "ready" });
      sendCtl(room.host, { __relay: "join", n: room.clients.size });
    } else {
      sendCtl(ws, { __relay: "nohost" });
    }
  }

  ws.on("message", (data, isBinary) => {
    if (isBinary) return; // text frames only (JSON envelopes)
    const text = data.toString();
    const r = rooms.get(code);
    if (!r) return;
    if (ws._role === "host") {
      for (const c of r.clients) forward(c, text);
    } else if (r.host) {
      forward(r.host, text);
    }
  });

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("close", () => {
    const r = rooms.get(code);
    if (!r) return;
    if (ws._role === "host") {
      if (r.host === ws) r.host = null;
      for (const c of r.clients) sendCtl(c, { __relay: "nohost" });
    } else {
      r.clients.delete(ws);
      if (r.host) sendCtl(r.host, { __relay: "leave", n: r.clients.size });
    }
    dropIfEmpty(code);
  });
});

// Drop half-open sockets so rooms don't leak on abrupt network loss.
const sweep = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      try {
        ws.terminate();
      } catch {
        /* ignore */
      }
      return;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      /* ignore */
    }
  });
}, 30000);
wss.on("close", () => clearInterval(sweep));

server.listen(PORT, () => console.log(`snitch relay listening on ${PORT}`));
