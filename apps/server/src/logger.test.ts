import { expect, test } from 'vitest';
import { createLogger } from './logger';

test('writes JSON lines at or above the minimum level', () => {
  const lines: string[] = [];
  const log = createLogger('info', (line) => lines.push(line));

  log.debug('hidden');
  log.info('listening', { port: 8080 });
  log.error('boom');

  expect(lines).toHaveLength(2);
  const first = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
  expect(first).toMatchObject({ level: 'info', message: 'listening', port: 8080 });
  expect(typeof first.time).toBe('string');
  expect(JSON.parse(lines[1] ?? '{}')).toMatchObject({ level: 'error', message: 'boom' });
});
