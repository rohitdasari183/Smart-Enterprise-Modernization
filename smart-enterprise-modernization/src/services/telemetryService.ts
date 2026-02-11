// src/services/telemetryService.ts
export async function pushTelemetry(vehicleId: string, enterpriseId: string, payload: any = {}) {
  const body = { enterpriseId, vehicleId, ...payload };
  const res = await fetch("/api/v1/telemetry/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
