import { loadConfig } from './config.js'; import { createApp } from './app.js';
const config=loadConfig();createApp(config).listen(config.PORT,()=>console.log(`KentBildir API :${config.PORT}`));
