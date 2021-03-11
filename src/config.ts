import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const packageJSON = JSON.parse(fs.readFileSync('./package.json').toString());

export const serverPort = parseInt(process.env.SERVER_PORT ?? '3090');

export const isProduction: boolean = !!(
  process.env.hasOwnProperty('NODE_ENV') &&
  process.env.NODE_ENV &&
  process.env.NODE_ENV.toLowerCase() === 'production'
);

export const logLevel: string = process.env.LOG_LEVEL ?? 'info';

export const appName: string = packageJSON.name;
export const appVersion: string = packageJSON.version;

export default {
  logLevel,
  appName,
  appVersion,
  isProduction,
  serverPort
};
