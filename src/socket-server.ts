import * as WebSocket from 'ws';
import { Server } from 'http';
import { Server as HttpsServer } from 'https';
import {
  SessionConnectionRefusedReason,
  SocketMessage,
  SocketMessageType
} from './schemas/socket-message-type.schema';
import {
  accessTokenParts,
  createAccessToken,
  SessionAccessTokenParts,
  SessionUserRole
} from './schemas/session-user.schema';
import {
  CombatCharacterSchema,
  NPCDetails
} from './schemas/combat-character.schema';
import {
  SessionNotFoundError,
  SessionService
} from './services/session.service';
import { CombatTrackerSchema } from './schemas/combat-tracker.schema';

const socketToToken = new Map<WebSocket, string>();
const tokenToSocket = new Map<string, WebSocket>();
const socketsBySession = new Map<string, WebSocket[]>();

class SocketPermissionDenied extends Error {
  constructor() {
    super('Socket tried to do something it was not allowed to.');
  }
}

type ValidatedSocketInfo = {
  token: string;
  tokenParts: SessionAccessTokenParts;
  socket: WebSocket;
};

async function validateSocketRole(
  socket: WebSocket,
  role: SessionUserRole
): Promise<ValidatedSocketInfo> {
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
        reject(err);
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

  for (const socket of sockets.filter(
    (sock) => sock.readyState === WebSocket.OPEN
  )) {
    send(socket, data).catch((err) => {
      console.error('sendToSession failed:', err);
    });
  }
}

async function handleConnectToSession(
  socket: WebSocket,
  sessionService: SessionService,
  payload: Record<string, string | number>
): Promise<void> {
  // TODO: wrap to catch errors
  const user = await sessionService.joinSession(
    payload.sessionId as string,
    payload.password as string,
    payload.role as number
  );
  const token = createAccessToken(
    payload.sessionId as string,
    user.id,
    user.role
  );
  const session = await sessionService.getSessionByToken(token);
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

async function handleCreateNewSession(
  socket: WebSocket,
  sessionService: SessionService,
  password: string
): Promise<void> {
  // todo validate password
  const session = await sessionService.createSession(password);
  await send(socket, {
    type: SocketMessageType.NewSessionCreated,
    payload: session.id
  });
}

async function handleAddCharacterToCombat(
  socket: WebSocket,
  sessionService: SessionService,
  characterData: Omit<CombatCharacterSchema, 'id'>
): Promise<void> {
  const { token } = await validateSocketRole(socket, SessionUserRole.Admin);
  await sessionService.addCharacter(token, characterData);
}

async function handleUpdateCharacter(
  socket: WebSocket,
  sessionService: SessionService,
  characterData: Partial<CombatCharacterSchema>
): Promise<void> {
  const { token } = await validateSocketRole(socket, SessionUserRole.Admin);
  if (characterData.id) {
    await sessionService.updateCharacter(
      token,
      characterData.id,
      characterData
    );
  }
}

async function handleCombatTrackerUpdateCharacterNPC(
  socket: WebSocket,
  sessionService: SessionService,
  data: { id: string; npc: Partial<NPCDetails> }
): Promise<void> {
  const { token } = await validateSocketRole(socket, SessionUserRole.Admin);
  await sessionService.updateCharacterNPCBlock(token, data.id, data.npc);
}

async function handleRemoveCharacter(
  socket: WebSocket,
  sessionService: SessionService,
  characterId: string
): Promise<void> {
  const { token } = await validateSocketRole(socket, SessionUserRole.Admin);
  await sessionService.removeCharacter(token, characterId);
}

async function handleNextTurn(
  socket: WebSocket,
  sessionService: SessionService
): Promise<void> {
  const { token } = await validateSocketRole(socket, SessionUserRole.Admin);
  await sessionService.nextTurn(token);
}

async function handlePreviousTurn(
  socket: WebSocket,
  sessionService: SessionService
): Promise<void> {
  const { token } = await validateSocketRole(socket, SessionUserRole.Admin);
  await sessionService.previousTurn(token);
}

async function handleCombatTrackerRestart(
  socket: WebSocket,
  sessionService: SessionService
): Promise<void> {
  const { token } = await validateSocketRole(socket, SessionUserRole.Admin);
  await sessionService.restartCombatRounds(token);
}

async function handleCombatTrackerClear(
  socket: WebSocket,
  sessionService: SessionService
): Promise<void> {
  const { token } = await validateSocketRole(socket, SessionUserRole.Admin);
  await sessionService.resetCombatTracker(token);
}

async function handleCombatTrackerStateSet(
  socket: WebSocket,
  sessionService: SessionService,
  state: CombatTrackerSchema
): Promise<void> {
  const { token } = await validateSocketRole(socket, SessionUserRole.Admin);
  await sessionService.resetCombatTracker(token, state);
}

async function handleSocketMessage(
  socket: WebSocket,
  data: WebSocket.Data,
  sessionService: SessionService
): Promise<void> {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data) as SocketMessage;

      try {
        switch (parsed.type) {
          case SocketMessageType.CreateNewSession:
            await handleCreateNewSession(
              socket,
              sessionService,
              parsed.payload as string
            );
            break;
          case SocketMessageType.ConnectToSession:
            await handleConnectToSession(
              socket,
              sessionService,
              parsed.payload as Record<string, string | number>
            );
            break;
          case SocketMessageType.CombatTrackerAddCharacter:
            await handleAddCharacterToCombat(
              socket,
              sessionService,
              parsed.payload as Omit<CombatCharacterSchema, 'id'>
            );
            break;
          case SocketMessageType.CombatTrackerRemoveCharacter:
            await handleRemoveCharacter(
              socket,
              sessionService,
              parsed.payload as string
            );
            break;
          case SocketMessageType.CombatTrackerUpdateCharacter:
            await handleUpdateCharacter(
              socket,
              sessionService,
              parsed.payload as Partial<CombatCharacterSchema>
            );
            break;
          case SocketMessageType.CombatTrackerNextTurn:
            await handleNextTurn(socket, sessionService);
            break;
          case SocketMessageType.CombatTrackerPreviousTurn:
            await handlePreviousTurn(socket, sessionService);
            break;
          case SocketMessageType.CombatTrackerRequestRestart:
            await handleCombatTrackerRestart(socket, sessionService);
            break;
          case SocketMessageType.CombatTrackerRequestClear:
            await handleCombatTrackerClear(socket, sessionService);
            break;
          case SocketMessageType.CombatTrackerUpdateCharacterNPC:
            await handleCombatTrackerUpdateCharacterNPC(
              socket,
              sessionService,
              parsed.payload as { id: string; npc: Partial<NPCDetails> }
            );
            break;
          case SocketMessageType.CombatTrackerState:
            await handleCombatTrackerStateSet(
              socket,
              sessionService,
              parsed.payload as CombatTrackerSchema
            );
            break;
          default:
            break;
        }
      } catch (e) {
        if (
          e instanceof SocketPermissionDenied ||
          e instanceof SessionNotFoundError
        ) {
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
              const index = list.findIndex((sock) => sock === socket);
              if (index >= 0) {
                list.splice(index, 1);
                socketsBySession.set(sessionKey, list);
              }
            }
          }
          await send(socket, {
            type: SocketMessageType.SessionConnectionRefused,
            payload:
              e instanceof SocketPermissionDenied
                ? SessionConnectionRefusedReason.InvalidPermissions
                : SessionConnectionRefusedReason.SessionNotFound
          });
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

async function handleSocketDisconnect(
  socket: WebSocket,
  sessionService: SessionService
): Promise<void> {
  const token = socketToToken.get(socket);
  if (!token) {
    return;
  }
  const session = await sessionService.getSessionByToken(token);
  tokenToSocket.delete(token);
  socketToToken.delete(socket);
  let list = socketsBySession.get(session.id);
  if (list) {
    const index = list.indexOf(socket);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }
}

export function createSocketServer(
  server: Server | HttpsServer,
  sessionService: SessionService
): WebSocket.Server {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data: WebSocket.Data) => {
      handleSocketMessage(ws, data, sessionService).catch((err) => {
        console.error('Error while handling socket message:', err);
      });
    });

    ws.on('close', (_code: number, _reason: string) => {
      // remove references to the socket
      handleSocketDisconnect(ws, sessionService).catch((err) => {
        console.error('Error removing socket from session:', err);
      });
    });
  });

  sessionService.subscribe(async (message) => {
    const { sessionId, payload } = message;

    try {
      switch (message.type) {
        case 'CHARACTER_ADD':
          await sendToSession(sessionId, {
            type: SocketMessageType.CombatTrackerCharacterAdded,
            payload: payload
          });
          break;
        case 'CHARACTER_REMOVE':
          await sendToSession(sessionId, {
            type: SocketMessageType.CombatTrackerCharacterRemoved,
            payload: payload
          });
          break;
        case 'CHARACTER':
          await sendToSession(sessionId, {
            type: SocketMessageType.CombatTrackerCharacterUpdated,
            payload: payload
          });
          break;
        case 'COMBAT_TRACKER_ACTIVE_CHARACTER':
          await sendToSession(sessionId, {
            type: SocketMessageType.CombatTrackerActiveCharacter,
            payload: payload
          });
          break;
        case 'COMBAT_TRACKER_ROUND':
          await sendToSession(sessionId, {
            type: SocketMessageType.CombatTrackerRound,
            payload: payload
          });
          break;
        case 'COMBAT_TRACKER':
          await sendToSession(sessionId, {
            type: SocketMessageType.CombatTrackerState,
            payload: payload
          });
          break;
        default:
          break;
      }
    } catch (e) {
      console.error(
        `Error while handling session broadcast of type "${message.type}":`,
        e
      );
    }
  });

  return wss;
}
