import { getDb } from './connection.js';
import { logger } from '../logger.js';
import crypto from 'node:crypto';

const DEMO_VEHICLES = [
  { plate: 'KHΑ-1001', make: 'Toyota', model: 'Yaris', year: 2023, category: 'economy', color: 'White', status: 'available', location: 'Heraklion', daily_rate: 35 },
  { plate: 'KHΑ-1002', make: 'Fiat', model: '500', year: 2022, category: 'economy', color: 'Red', status: 'available', location: 'Heraklion', daily_rate: 30 },
  { plate: 'KHΑ-2001', make: 'Volkswagen', model: 'Golf', year: 2024, category: 'compact', color: 'Silver', status: 'rented', location: 'Chania', daily_rate: 50 },
  { plate: 'KHΑ-2002', make: 'Hyundai', model: 'i30', year: 2023, category: 'compact', color: 'Blue', status: 'available', location: 'Chania', daily_rate: 45 },
  { plate: 'KHΑ-3001', make: 'BMW', model: '320i', year: 2024, category: 'sedan', color: 'Black', status: 'available', location: 'Rethymno', daily_rate: 80 },
  { plate: 'KHΑ-4001', make: 'Toyota', model: 'RAV4', year: 2024, category: 'suv', color: 'Grey', status: 'maintenance', location: 'Heraklion', daily_rate: 90 },
  { plate: 'KHΑ-5001', make: 'Ford', model: 'Transit', year: 2021, category: 'van', color: 'White', status: 'available', location: 'Airport', daily_rate: 70 },
  { plate: 'KHΑ-6001', make: 'Mercedes', model: 'E-Class', year: 2024, category: 'luxury', color: 'Black', status: 'available', location: 'Airport', daily_rate: 150 },
];

export function seedDatabase(): void {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) AS c FROM vehicles').get() as { c: number }).c;

  if (count > 0) {
    logger.debug('Seed skipped — vehicles table not empty');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO vehicles (id, plate, make, model, year, category, color, status, location, daily_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const v of DEMO_VEHICLES) {
      insert.run(crypto.randomUUID(), v.plate, v.make, v.model, v.year, v.category, v.color, v.status, v.location, v.daily_rate);
    }
  });

  tx();
  logger.info(`Seeded ${DEMO_VEHICLES.length} demo vehicles`);
}

// Run directly: npx tsx src/db/seed.ts
if (process.argv[1]?.endsWith('seed.ts')) {
  const { initSchema } = await import('./schema.js');
  initSchema();
  seedDatabase();
  const { closeDb } = await import('./connection.js');
  closeDb();
}
