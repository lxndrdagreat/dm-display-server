import * as WebSocket from 'ws';
import {Server} from 'http';
import {Server as HttpsServer} from 'https';
import {SocketMessage, SocketMessageType} from './schemas/socket-message-type.schema';
import {getSessionByToken} from './services/session-service';

const tokenToSocket = new Map<string, WebSocket>();
const socketsBySession = new Map<string, WebSocket[]>();

async function handleConnectToSession(socket: WebSocket, token: string): Promise<void> {
  // TODO: wrap to catch errors
  const session = await getSessionByToken(token);
  tokenToSocket.set(token, socket);
  const list = socketsBySession.get(session.id) || [];
  list.push(socket);
  socketsBySession.set(session.id, list);
  socket.send({
    type: SocketMessageType.SessionConnected
  });

  socket.send({
    type: SocketMessageType.FullState,
    payload: {
      id: session.id,
      activeScreen: session.activeScreen,
      combatTracker: session.combatTracker
    }
  });
}

async function handleSocketMessage(socket: WebSocket, data: WebSocket.Data): Promise<void> {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data) as SocketMessage;
      console.log(parsed.type, parsed.payload);

      switch (parsed.type) {
        case SocketMessageType.ConnectToSession:
          await handleConnectToSession(socket, parsed.payload as string);
          break;
        default:
          break;
      }

    } catch (e) {
      console.error(e);
    }
  }
}

export function createSocketServer(server: Server | HttpsServer ): WebSocket.Server {

  const wss = new WebSocket.Server({server});

  wss.on('connection', (ws: WebSocket) => {

    ws.on('message', (data: WebSocket.Data) => {
      handleSocketMessage(ws, data);
    });

    ws.on('close', (code: number, reason: string) => {
      console.log('Connection closed:', code, reason);
      // TODO: remove references to the socket
    });
  });

  return wss;
}
