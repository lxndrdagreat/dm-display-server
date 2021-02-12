import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const packageJSON = JSON.parse(fs.readFileSync('./package.json').toString());

function getEnvironmentValue(name: string): string {
  if (process.env[name]) {
    return process.env[name] as string;
  }

  throw new Error(
    `Environment variable: ${name} is not set. If using .env please check your .env file`
  );
}

export const expressServerPort: number = parseInt(
  getEnvironmentValue('EXPRESS_SERVER_PORT')
);
export const isProduction: boolean = !!(
  process.env.hasOwnProperty('NODE_ENV') &&
  process.env.NODE_ENV &&
  process.env.NODE_ENV.toLowerCase() === 'production'
);

export const logLevel: string = getEnvironmentValue('LOG_LEVEL');

export const appName: string = packageJSON.name;
export const appVersion: string = packageJSON.version;
