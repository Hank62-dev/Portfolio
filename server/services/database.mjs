// Opens the database that keeps the owner's data in step across devices. In production it is Postgres (Neon's free tier works)
// through DATABASE_URL. For local development there is an in-process Postgres (PGlite) so nothing has to be installed:
// set SPACEHANK_SYNC_PGLITE to a folder, or to "memory". With neither, sync is simply off.

export const openDatabase = async (config, env = process.env) => {
  if (config.databaseUrl) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 4, idleTimeoutMillis: 30000, connectionTimeoutMillis: 20000 });
    // a free database that was asleep drops idle connections; that must not stop the server
    pool.on('error', (error) => console.warn('Sync database connection dropped:', error.message));
    return { query: (text, params) => pool.query(text, params), close: () => pool.end(), kind: 'postgres' };
  }
  if (env.SPACEHANK_SYNC_PGLITE) {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = env.SPACEHANK_SYNC_PGLITE === 'memory' ? new PGlite() : new PGlite(env.SPACEHANK_SYNC_PGLITE);
    return { query: (text, params) => db.query(text, params), close: () => db.close(), kind: 'pglite' };
  }
  return null;
};
