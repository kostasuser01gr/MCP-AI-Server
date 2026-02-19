import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { registerTool, auditLog } from './registry.js';
import { KNOWLEDGE_DIR } from '../config.js';
import { logger } from '../logger.js';

registerTool({
  name: 'knowledge_search',
  description: 'Search the local knowledge base (markdown/text files in ./knowledge) for content matching a query.',
  parameters: z.object({
    query: z.string().min(1).describe('Search query (case-insensitive substring match)'),
  }),
  handler: (params) => {
    const query = (params.query as string).toLowerCase();

    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      logger.warn('Knowledge directory not found', { path: KNOWLEDGE_DIR });
      return { results: [], message: 'Knowledge directory does not exist. Add .md or .txt files to ./knowledge/' };
    }

    const results: Array<{ file: string; matches: string[] }> = [];

    const files = walkDir(KNOWLEDGE_DIR);
    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.md' && ext !== '.txt') continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const matched: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.toLowerCase().includes(query)) {
          // Return matching line with ±1 context
          const start = Math.max(0, i - 1);
          const end = Math.min(lines.length - 1, i + 1);
          const snippet = lines.slice(start, end + 1).join('\n');
          matched.push(snippet);
        }
      }

      if (matched.length > 0) {
        results.push({ file: path.relative(KNOWLEDGE_DIR, filePath), matches: matched.slice(0, 5) });
      }
    }

    auditLog('knowledge_search', 'read');
    return { query: params.query, results, totalFiles: files.length };
  },
});

function walkDir(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkDir(full));
    } else {
      out.push(full);
    }
  }
  return out;
}
