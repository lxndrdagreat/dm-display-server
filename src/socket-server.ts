import * as WebSocket from 'ws';
import {Server} from 'http';
import {Server as HttpsServer} from 'https';
import {SocketMessage, SocketMessageType} from './schemas/socket-message-type.schema';
import {createSession, getSessionByToken, joinSession} from './services/session-service';
import {
  accessTokenParts,
  createAccessToken,
  SessionAccessTokenParts,
  SessionUserRole
} from './schemas/session-user.schema';
import {CombatCharacterSchema} from './schemas/combat-character.schema';
import {addCharacter} from './services/combat-tracker-service';

const socketToToken = new Map<WebSocket, string>();
const tokenToSocket = new Map<string, WebSocket>();
const socketsBySession = new Map<string, WebSocket[]>();

class SocketPermissionDenied extends Error {
  constructor() {
    super('Socket tried to do something it was not allowed to.');
  }
}

type ValidatedSocketInfo = {token: string; tokenParts: SessionAccessTokenParts; socket: WebSocket;}
async function validateSocketRole(socket: WebSocket, role: SessionUserRole): Promise<ValidatedSocketInfo> {
  if (!socketToToken.has(socket)) {
    throw new SocketPermissionDenied();
  }
  const token = socketToToken.get(socket);
  if (!token) {
    throw new SocketPermissionDenied();
  }
  const parsed = accessTokenParts(token);
  if (parsed.userRole !== role) {
    throw new SocketPermissionDenied();
  }
  return {
    socket: socket,
    token: token,
    tokenParts: parsed
  };
}

async function send(socket: WebSocket, data: unknown): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    socket.send(JSON.stringify(data), (err?: Error) => {
      if (err) {
        reject();
      } else {
        resolve();
      }
    });
  });
}

async function sendToSession(sessionId: string, data: unknown): Promise<void> {
  const sockets = socketsBySession.get(sessionId);
  if (!sockets) {
    return;
  }

  for (const socket of sockets) {
    send(socket, data);
  }

}

async function handleConnectToSession(socket: WebSocket, payload: Record<string, string|number>): Promise<void> {
  // TODO: wrap to catch errors
  const user = await joinSession(payload.sessionId as string, payload.password as string, payload.role as number);
  const token = createAccessToken(payload.sessionId as string, user.id, user.role);
  const session = await getSessionByToken(token);
  tokenToSocket.set(token, socket);
  socketToToken.set(socket, token);
  const list = socketsBySession.get(session.id) || [];
  list.push(socket);
  socketsBySession.set(session.id, list);
  await send(socket, {
    type: SocketMessageType.SessionConnected,
    payload: token
  });

  await send(socket, {
    type: SocketMessageType.FullState,
    payload: {
      id: session.id,
      activeScreen: session.activeScreen,
      combatTracker: session.combatTracker
    }
  });
}

async function handleCreateNewSession(socket: WebSocket, password: string): Promise<void> {
  // todo validate password
  const session = await createSession(password);
  console.info('Created new session:', session.id);
  await send(socket, {
    type: SocketMessageType.NewSessionCreated,
    payload: session.id
  });
}

async function handleAddCharacterToCombat(socket: WebSocket, characterData: Omit<CombatCharacterSchema, 'id'>): Promise<void> {
  const info = await validateSocketRole(socket, SessionUserRole.Admin);
  const newCharacter = await addCharacter(info.token, characterData);
  await sendToSession(info.tokenParts.sessionId, {
    type: SocketMessageType.CombatTrackerCharacterAdded,
    payload: newCharacter
  });
}

async function handleSocketMessage(socket: WebSocket, data: WebSocket.Data): Promise<void> {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data) as SocketMessage;
      console.log(parsed.type, parsed.payload);

      try {
        switch (parsed.type) {
          case SocketMessageType.CreateNewSession:
            await handleCreateNewSession(socket, parsed.payload as string);
            break;
          case SocketMessageType.ConnectToSession:
            await handleConnectToSession(socket, parsed.payload as Record<string, string|number>);
            break;
          case SocketMessageType.CombatTrackerAddCharacter:
            await handleAddCharacterToCombat(socket, parsed.payload as Omit<CombatCharacterSchema, 'id'>);
            break;
          case SocketMessageType.CombatTrackerCharacterRemoved:
            // TODO: handle character removal
            break;
          case SocketMessageType.CombatTrackerCharacterUpdated:
            // TODO: handle character updated
            break;
          default:
            break;
        }
      } catch (e) {
        if (e instanceof SocketPermissionDenied) {
          // force disconnect the socket. we don't like them anymore.
          if (socketToToken.has(socket)) {
            const token = socketToToken.get(socket) as string;
            socketToToken.delete(socket);
            tokenToSocket.delete(token);
            for (const sessionKey of socketsBySession.keys()) {
              const list = socketsBySession.get(sessionKey);
              if (!list) {
                continue;
              }
              const index = list.findIndex(sock => sock === socket);
              if (index >= 0) {
                list.splice(index, 1);
                socketsBySession.set(sessionKey, list);
              }
            }
          }
          socket.close();
        } else {
          console.error(e);
        }
      }

    } catch (e) {
      console.error(e);
    }
  } else {
    console.log('invalid message:', data);
  }
}

export function createSocketServer(server: Server | HttpsServer): WebSocket.Server {

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
