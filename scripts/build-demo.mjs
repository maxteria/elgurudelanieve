import { execSync } from 'child_process';
const env = { ...process.env, PUBLIC_WEATHER_MODE: 'demo' };
execSync('npx astro build', { stdio: 'inherit', env, shell: true });
