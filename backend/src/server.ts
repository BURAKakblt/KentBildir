import { loadConfig } from './config.js';
import { createApp } from './app.js';

const config = loadConfig();
createApp(config).listen(config.PORT, '0.0.0.0', () => console.log('server_listening', { port: config.PORT }));
