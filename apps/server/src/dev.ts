// Development entry point (`npm run dev`). Sets development defaults in a way that works
// on every OS, then starts the normal server.
process.env.NODE_ENV ??= 'development';
process.env.LOG_LEVEL ??= 'debug';

await import('./main');

export {};
