import * as WebSocket from 'ws';
import {Server} from 'http';
import {Server as HttpsServer} from 'https';

export function createSocketServer(server: Server | HttpsServer ): WebSocket.Server {

  const wss = new WebSocket.Server({server});

  wss.on('connection', (ws: WebSocket.Server) => {

    ws.on('message', (data: WebSocket.Data) => {
      console.log('message', data);
    });

    ws.on('close', (code: number, reason: string) => {
      console.log('Connection closed:', code, reason);
    });
  });

  return wss;
}
