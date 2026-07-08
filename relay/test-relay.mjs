// Local smoke test for the relay: start the server, connect a host + a client on a code, and assert that a
// host frame reaches the client and a client frame reaches the host, plus the join/leave signalling.
import { spawn } from "child_process";
import { WebSocket } from "ws";

const PORT = 8099;
const proc = spawn(process.execPath, ["server.js"], { env: { ...process.env, PORT: String(PORT) }, stdio: "inherit" });
const base = `ws://127.0.0.1:${PORT}/?`;
const log = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = {};

function open(role, code) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${base}role=${role}&code=${code}`);
    ws.on("open", () => resolve(ws));
  });
}
function onMsg(ws, tag) {
  ws.on("message", (d) => log.push({ tag, msg: d.toString() }));
}

try {
  await wait(600); // let the server boot

  const code = "TESTCODE1";
  const host = await open("host", code);
  onMsg(host, "host");
  await wait(100);
  const client = await open("client", code);
  onMsg(client, "client");
  await wait(200);

  host.send(JSON.stringify({ d: "SNAPSHOT_CIPHERTEXT" }));
  await wait(150);
  client.send(JSON.stringify({ d: "CONTROL_CIPHERTEXT" }));
  await wait(200);

  const hostGotReady = log.some((l) => l.tag === "host" && l.msg.includes('"__relay":"ready"'));
  const hostGotJoin = log.some((l) => l.tag === "host" && l.msg.includes('"__relay":"join"'));
  const clientGotReady = log.some((l) => l.tag === "client" && l.msg.includes('"__relay":"ready"'));
  const clientGotSnapshot = log.some((l) => l.tag === "client" && l.msg.includes("SNAPSHOT_CIPHERTEXT"));
  const hostGotControl = log.some((l) => l.tag === "host" && l.msg.includes("CONTROL_CIPHERTEXT"));

  // second client joins, then leaves -> host sees join(n=2) then leave(n=1)
  const client2 = await open("client", code);
  await wait(150);
  client2.close();
  await wait(200);
  const hostGotLeave = log.some((l) => l.tag === "host" && l.msg.includes('"__relay":"leave"'));

  // a client on a code with no host gets nohost
  const orphan = await open("client", "NOHOSTCODE");
  onMsg(orphan, "orphan");
  await wait(200);
  const orphanNohost = log.some((l) => l.tag === "orphan" && l.msg.includes('"__relay":"nohost"'));

  results.hostGotReady = hostGotReady;
  results.clientGotReady = clientGotReady;
  results.hostGotJoin = hostGotJoin;
  results.clientGotSnapshot_hostToClient = clientGotSnapshot;
  results.hostGotControl_clientToHost = hostGotControl;
  results.hostGotLeave = hostGotLeave;
  results.orphanNohost = orphanNohost;

  const pass = Object.values(results).every(Boolean);
  console.log("\n=== RELAY TEST RESULTS ===");
  for (const [k, v] of Object.entries(results)) console.log(`  ${v ? "PASS" : "FAIL"}  ${k}`);
  console.log(pass ? "\nALL PASS" : "\nSOME FAILED");
  host.close();
  client.close();
  orphan.close();
  process.exitCode = pass ? 0 : 1;
} catch (e) {
  console.error("test error:", e);
  process.exitCode = 1;
} finally {
  await wait(100);
  proc.kill();
}
