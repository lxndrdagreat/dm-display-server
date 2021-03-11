import { createSocketServer } from './socket-server';
import { SessionService } from './services/session.service';
import fastify from 'fastify';
import config from './config';
import statsResource from './resources/stats.resource';

const server = fastify({ logger: { level: config.logLevel } });

// init session service
const sessionService = new SessionService();

// init socket server
createSocketServer(server.server, sessionService);

// init routes
statsResource(server);

server.listen(config.serverPort, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`DM Display Server listening at ${address}.`);
});
