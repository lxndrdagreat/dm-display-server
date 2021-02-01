import * as express from 'express';
import * as https from 'https';
import * as fs from 'fs';
import * as cookieParser from 'cookie-parser';
import * as config from './config/config';
import { UnthinkExpressGenerator } from '@epandco/unthink-foundation-express';
import { UnthinkGenerator } from '@epandco/unthink-foundation';
import resourceDefinitions from './resource-definitions';
import {createSocketServer} from './socket-server';
import {SessionService} from './services/session.service';

const app: express.Application = express();
app.use(cookieParser());

const expressGen = new UnthinkExpressGenerator(
  app,
  (): string => '',
  config.logLevel
);
const unthinkGen = new UnthinkGenerator(expressGen);

resourceDefinitions.forEach(rd => unthinkGen.add(rd));

unthinkGen.printRouteTable();
unthinkGen.generate();

let server;

if (!config.isProduction) {
  // Enable HTTPS for local development
  server = https.createServer(
    {
      key: fs.readFileSync('./certs/localhost.key'),
      cert: fs.readFileSync('./certs/localhost.crt'),
    },
    app
  ).listen(config.expressServerPort);
} else {
  server = app.listen(config.expressServerPort);
}

// init session service
const sessionService = new SessionService();

createSocketServer(server, sessionService);
