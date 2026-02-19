import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { registerTool, auditLog } from './registry.js';

registerTool({
  name: 'report_daily_summary',
  description: 'Get a daily KPI summary: fleet counts by status, washes, sales, and revenue for a given date.',
  parameters: z.object({
    date: z.string().describe('Date in YYYY-MM-DD format'),
  }),
  handler: (params) => {
    const db = getDb();
    const date = params.date as string;
    const nextDay = `${date}T23:59:59`;
    const dayStart = `${date}T00:00:00`;

    // Fleet status counts
    type StatusRow = { status: string; count: number };
    const fleetStatus = db.prepare(
      'SELECT status, COUNT(*) as count FROM vehicles GROUP BY status',
    ).all() as StatusRow[];

    const totalVehicles = fleetStatus.reduce((s, r) => s + r.count, 0);

    // Washes today
    const washCount = (db.prepare(
      'SELECT COUNT(*) as c FROM washes WHERE timestamp >= ? AND timestamp <= ?',
    ).get(dayStart, nextDay) as { c: number }).c;

    // Sales today
    type SalesAgg = { count: number; total: number | null };
    const salesAgg = db.prepare(
      'SELECT COUNT(*) as count, SUM(amount) as total FROM sales WHERE timestamp >= ? AND timestamp <= ?',
    ).get(dayStart, nextDay) as SalesAgg;

    auditLog('report_daily_summary', 'read');

    return {
      date,
      fleet: { total: totalVehicles, byStatus: Object.fromEntries(fleetStatus.map(r => [r.status, r.count])) },
      washes: washCount,
      sales: { count: salesAgg.count, revenue: salesAgg.total ?? 0 },
    };
  },
});
