import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { registerTool, auditLog } from './registry.js';

registerTool({
  name: 'wash_log_create',
  description: 'Log a vehicle wash performed by an employee.',
  parameters: z.object({
    vehicleId: z.string().describe('The vehicle UUID'),
    employeeId: z.string().describe('The employee ID who performed the wash'),
    timestamp: z.string().describe('ISO 8601 timestamp of the wash'),
    notes: z.string().optional().describe('Optional notes about the wash'),
  }),
  handler: (params) => {
    const db = getDb();

    // Verify vehicle exists
    const vehicle = db.prepare('SELECT id, plate FROM vehicles WHERE id = ?').get(params.vehicleId);
    if (!vehicle) {
      return { error: `Vehicle ${params.vehicleId as string} not found` };
    }

    const result = db.prepare(
      'INSERT INTO washes (vehicle_id, employee_id, timestamp, notes) VALUES (?, ?, ?, ?)',
    ).run(params.vehicleId, params.employeeId, params.timestamp, params.notes ?? null);

    const record = { id: result.lastInsertRowid, ...params };
    auditLog('wash_log_create', 'create', 'wash', String(result.lastInsertRowid), null, record);

    return { success: true, washId: result.lastInsertRowid };
  },
});
