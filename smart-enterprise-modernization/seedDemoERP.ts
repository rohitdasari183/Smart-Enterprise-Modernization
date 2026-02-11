// seedDemoERP.ts
// ✅ Seeds PostgreSQL ERP database with demo automobile enterprise data
// Run:  npx tsx seedDemoERP.ts
// Prereqs: npm install pg @faker-js/faker @types/pg tsx --save-dev

import { Client } from "pg";
import { faker } from "@faker-js/faker";

interface VehicleRow {
  vehicle_id: string;
}

function generateId(prefix: string, index: number): string {
  return `${prefix}${index.toString().padStart(3, "0")}`;
}

async function seed() {
  const client = new Client({
    host: process.env.ERP_DB_HOST || "127.0.0.1",
    port: Number(process.env.ERP_DB_PORT || 5432),
    user: process.env.ERP_DB_USER || "erp_user",
    password: process.env.ERP_DB_PASSWORD || "erp_pass",
    database: process.env.ERP_DB_NAME || "demo_erp",
  });

  await client.connect();
  console.log("✅ Connected to PostgreSQL ERP database...");

  // Insert enterprise
  const enterpriseId = generateId("E", 1);
  await client.query(
    `INSERT INTO enterprises (enterprise_id, name, industry, country)
     VALUES ($1,$2,$3,$4)`,
    [enterpriseId, "AutoNova Motors", "Automotive Manufacturing", "Germany"]
  );
  console.log("🏢 Inserted enterprise id:", enterpriseId);

  // Insert users (100)
  const roles = ["Admin", "Fleet Manager", "Technician", "Operator"];
  for (let i = 1; i <= 100; i++) {
    await client.query(
      `INSERT INTO users (user_id, fullname, email, role, enterprise_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        generateId("U", i),
        faker.person.fullName(),
        faker.internet.email(),
        faker.helpers.arrayElement(roles),
        enterpriseId,
      ]
    );
  }
  console.log("👤 Inserted 100 users ✅");

  // Insert vehicles (100)
  const makes = ["Tesla", "BMW", "Mercedes", "Audi", "Toyota", "Volvo", "Ford", "Honda"];
  const vehicleImageUrls = [
    "https://images.unsplash.com/photo-1517949908110-76d7c2ef3f6d",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a",
    "https://images.unsplash.com/photo-1605559424843-9e4c9b4901c1",
    "https://images.unsplash.com/photo-1493238792000-8113da705763",
    "https://images.unsplash.com/photo-1493238792000-8113da705763",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d",
    "https://images.unsplash.com/photo-1583124779075-2b6a4b8b9f81"
  ];

  for (let i = 1; i <= 100; i++) {
    const make = faker.helpers.arrayElement(makes);
    const model = faker.vehicle.model();
    const vin = faker.vehicle.vin();
    const name = `${make} ${model}`;
    const status = faker.helpers.arrayElement(["Active", "Idle", "Maintenance"]);
    const image = `${faker.helpers.arrayElement(vehicleImageUrls)}?auto=format&fit=crop&w=800&q=80`;

    await client.query(
      `INSERT INTO vehicles (vehicle_id, vin, name, type, status, image_url, enterprise_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [generateId("V", i), vin, name, "Car", status, image, enterpriseId]
    );
  }
  console.log("🚗 Inserted 100 vehicles ✅");

  // Fetch vehicle IDs for linking
  const vehicleRows = await client.query<VehicleRow>(`SELECT vehicle_id FROM vehicles`);
  const vehicleIds = vehicleRows.rows.map(v => v.vehicle_id);

  // Insert assets (100 vehicle parts)
  const partNames = [
    "Steering Wheel", "Accelerator", "Brake Pedal", "Headlight", "Tail Light", "Engine",
    "Transmission", "Gearbox", "Clutch", "Radiator", "Suspension", "Battery", "Air Filter",
    "Seat Belt", "Rearview Mirror", "Wiper Blade", "Fuel Pump", "Spark Plug", "Tire", "Muffler"
  ];

  for (let i = 1; i <= 100; i++) {
    const part = faker.helpers.arrayElement(partNames);
    const category = "Vehicle Part";
    const value = faker.number.float({ min: 50, max: 2000, fractionDigits: 2 });
    const vehicleId = faker.helpers.arrayElement(vehicleIds);
    const status = faker.helpers.arrayElement(["active", "defective", "replaced"]);

    await client.query(
      `INSERT INTO assets (asset_id, name, category, description, vehicle_id, enterprise_id, quantity, value, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        generateId("A", i),
        part,
        category,
        faker.commerce.productDescription(),
        vehicleId,
        enterpriseId,
        faker.number.int({ min: 1, max: 5 }),
        value,
        status
      ]
    );
  }
  console.log("🧩 Inserted 100 assets (vehicle parts) ✅");

  // Insert telemetry data (100)
  for (let i = 1; i <= 100; i++) {
    const vehicleId = faker.helpers.arrayElement(vehicleIds);
    await client.query(
      `INSERT INTO telemetry_data (telemetry_id, vehicle_id, speed, temperature, pressure, battery_level, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        generateId("T", i),
        vehicleId,
        faker.number.int({ min: 0, max: 160 }),
        Number(faker.number.float({ min: 10, max: 60, fractionDigits: 1 })),
        Number(faker.number.float({ min: 25, max: 40, fractionDigits: 1 })),
        faker.number.int({ min: 30, max: 100 }),
        Date.now() - faker.number.int({ min: 0, max: 1000 * 60 * 60 * 24 * 7 }),
      ]
    );
  }
  console.log("📡 Inserted 100 telemetry data records ✅");

  // Insert analytics (100)
  for (let i = 1; i <= 100; i++) {
    await client.query(
      `INSERT INTO analytics (analytics_id, enterprise_id, avg_speed, uptime, energy_efficiency, last_updated)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        generateId("AAN", i),
        enterpriseId,
        Number(faker.number.float({ min: 40, max: 90, fractionDigits: 1 })),
        Number(faker.number.float({ min: 80, max: 99, fractionDigits: 1 })),
        Number(faker.number.float({ min: 50, max: 100, fractionDigits: 1 })),
        Date.now(),
      ]
    );
  }
  console.log("📊 Inserted 100 analytics records ✅");

  await client.end();
  console.log("✅ Seeding completed successfully!");
}

seed().catch((err) => {
  console.error("❌ Seeding failed", err);
  process.exit(1);
});
