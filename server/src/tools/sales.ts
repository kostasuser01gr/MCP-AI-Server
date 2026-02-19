import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { registerTool, auditLog } from './registry.js';

registerTool({
  name: 'sales_log_create',
  description: 'Record a vehicle sale transaction.',
  parameters: z.object({
    vehicleId: z.string().describe('The vehicle UUID'),
    sellerId: z.string().describe('ID of the salesperson'),
    amount: z.number().positive().describe('Sale amount in EUR'),
    extras: z.array(z.string()).optional().describe('List of extras included in the sale'),
    timestamp: z.string().describe('ISO 8601 timestamp of the sale'),
  }),
  handler: (params) => {
    const db = getDb();

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.vehicleId) as Record<string, unknown> | undefined;
    if (!vehicle) {
      return { error: `Vehicle ${params.vehicleId as string} not found` };
    }

    const extrasJson = params.extras ? JSON.stringify(params.extras) : null;

    const result = db.prepare(
      'INSERT INTO sales (vehicle_id, seller_id, amount, extras, timestamp) VALUES (?, ?, ?, ?, ?)',
    ).run(params.vehicleId, params.sellerId, params.amount, extrasJson, params.timestamp);

    // Mark vehicle as sold
    db.prepare("UPDATE vehicles SET status = 'sold', updated_at = datetime('now') WHERE id = ?").run(params.vehicleId);

    const afterVehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.vehicleId);
    auditLog('sales_log_create', 'create', 'sale', String(result.lastInsertRowid), vehicle, afterVehicle);

    return { success: true, saleId: result.lastInsertRowid, vehicleMarkedAsSold: true };
  },
});
