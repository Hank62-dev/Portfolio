import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const config = loadConfig();
const app = createApp(config);

app.listen().then((port) => console.log(`SpaceHank realtime server listening on http://localhost:${port} (password auth enabled)`));
