import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as config from './config/config';
import { UnthinkExpressGenerator } from '@epandco/unthink-foundation-express';
import { UnthinkGenerator } from '@epandco/unthink-foundation';
import resourceDefinitions from './resource-definitions';
import { createSocketServer } from './socket-server';
import { SessionService } from './services/session.service';

const app: express.Application = express();
app.use(cookieParser());

const expressGen = new UnthinkExpressGenerator(
  app,
  (): string => '',
  config.logLevel
);
const unthinkGen = new UnthinkGenerator(expressGen);

resourceDefinitions.forEach((rd) => unthinkGen.add(rd));

unthinkGen.printRouteTable();
unthinkGen.generate();

const server = app.listen(config.expressServerPort);

// init session service
const sessionService = new SessionService();

createSocketServer(server, sessionService);
