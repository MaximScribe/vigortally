import pkg from '../package.json' with { type: 'json' };

export const APP_NAME = 'VigorTally';

/** Server release version, from package.json. */
export const SERVER_VERSION: string = pkg.version;

/**
 * Version of the HTTP API contract. Bumped only for breaking changes, so companion apps
 * can tell whether they can talk to this server.
 */
export const API_VERSION = 1;
