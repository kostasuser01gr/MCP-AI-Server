import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { registerTool, auditLog } from './registry.js';

// ── fleet_list_vehicles ────────────────────────────────────────────────────

registerTool({
  name: 'fleet_list_vehicles',
  description: 'List all vehicles, optionally filtered by status and/or location.',
  parameters: z.object({
    status: z.string().optional().describe('Filter by status (available, rented, maintenance, sold)'),
    location: z.string().optional().describe('Filter by location name (partial match)'),
  }),
  handler: (params) => {
    const db = getDb();
    const conds: string[] = [];
    const vals: unknown[] = [];

    if (params.status) { conds.push('status = ?'); vals.push(params.status); }
    if (params.location) { conds.push('location LIKE ?'); vals.push(`%${params.location as string}%`); }

    const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
    const vehicles = db.prepare(`SELECT * FROM vehicles ${where} ORDER BY make, model`).all(...vals);

    auditLog('fleet_list_vehicles', 'read');
    return { vehicles, count: vehicles.length };
  },
});

// ── fleet_update_status ────────────────────────────────────────────────────

registerTool({
  name: 'fleet_update_status',
  description: 'Update the status of a specific vehicle by its ID.',
  parameters: z.object({
    vehicleId: z.string().describe('The vehicle UUID'),
    status: z.string().describe('New status value (available, rented, maintenance, sold)'),
    note: z.string().optional().describe('Optional note about the status change'),
  }),
  handler: (params) => {
    const db = getDb();
    const before = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.vehicleId);
    if (!before) {
      return { error: `Vehicle ${params.vehicleId as string} not found` };
    }

    db.prepare(`UPDATE vehicles SET status = ?, notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?`)
      .run(params.status, params.note ?? null, params.vehicleId);

    const after = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.vehicleId);
    auditLog('fleet_update_status', 'update', 'vehicle', params.vehicleId as string, before, after);

    return { success: true, vehicle: after };
  },
});
