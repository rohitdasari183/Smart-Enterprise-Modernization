// src/lib/telemetrySimulator.ts
import fetch from "node-fetch";

/**
 * Simple simulator: posts telemetry to your telemetry add API.
 * Run locally with Node to stream demo telemetry into Firestore.
 *
 * Usage:
 *   node -r ts-node/register src/lib/telemetrySimulator.ts
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

function randomNear(base: number, variance = 0.15) {
  const delta = base * variance;
  return Math.max(0, Math.round((base + (Math.random() - 0.5) * 2 * delta) * 100) / 100);
}

async function sendSample(enterpriseId: string, vehicleId: string) {
  const payload = {
    enterpriseId,
    vehicleId,
    speed: randomNear(60),
    temperature: randomNear(75),
    pressure: randomNear(32),
    batteryLevel: Math.round(randomNear(80)),
    location: { lat: 42.33 + Math.random() * 0.02, lng: -83.04 + Math.random() * 0.02 },
  };

  const res = await fetch(`${BASE}/api/v1/telemetry/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  console.log("sent:", payload, "->", json);
}

async function run() {
  const enterpriseId = process.env.SIM_ENTERPRISE || "demo-enterprise";
  const vehicleId = process.env.SIM_VEHICLE || "V-TEST-001";
  const interval = Number(process.env.SIM_INTERVAL_MS) || 5000;
  console.log(`Starting telemetry simulator for ${enterpriseId}/${vehicleId} every ${interval}ms`);
  setInterval(() => sendSample(enterpriseId, vehicleId), interval);
}

if (require.main === module) run();
