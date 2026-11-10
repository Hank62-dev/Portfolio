import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';
import { openDatabase } from './services/database.mjs';

const config = loadConfig();
const db = await openDatabase(config);
const app = createApp(config, { db });

app.listen().then((port) => {
  console.log(`SpaceHank realtime server listening on http://localhost:${port} (password auth enabled)`);
  console.log(db ? `Sync: on (${db.kind})` : 'Sync: off (no DATABASE_URL), the workspace stays on each device');
});
