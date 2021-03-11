import { FastifyInstance } from 'fastify';
import config from '../config';

export default (server: FastifyInstance): void => {
  server.get('/', async (_request, _reply) => {
    return {
      server: {
        version: config.appVersion
      }
    };
  });
};
