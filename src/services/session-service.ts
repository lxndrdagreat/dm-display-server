import {ActiveScreen, SessionSchema} from '../schemas/session.schema';
import {accessTokenParts, SessionAccessToken, SessionUserRole, SessionUserSchema} from '../schemas/session-user.schema';
import {initCombatTrackerState} from '../schemas/combat-tracker.schema';
import {nextUID} from './uid-service';

// Using an in-memory store for now
const sessionDb = new Map<string, SessionSchema>();

export class SessionNotFoundError extends Error {
  constructor() {
    super('Session not found.');
  }
}

export class SessionRoleDenied extends Error {
  constructor() {
    super('Invalid role.');
  }
}

// Note: this is private (not exported) on purpose.
async function getSessionById(sessionId: string, sessionPassword?: string): Promise<SessionSchema> {
  const session = sessionDb.get(sessionId);
  if (!session) {
    throw new SessionNotFoundError();
  }
  if (sessionPassword && sessionPassword !== session.password) {
    throw new SessionNotFoundError();
  }
  return session;
}

export async function createSession(password: string): Promise<Readonly<SessionSchema>> {
  const sessionId = nextUID();

  const session: SessionSchema = {
    id: sessionId,
    // TODO: hash this password
    password: password,
    // TODO: include initial admin user
    users: [],
    activeScreen: ActiveScreen.CombatTracker,
    combatTracker: initCombatTrackerState()
  };

  sessionDb.set(sessionId, session);
  return session;
}

export async function removeSession(sessionId: string): Promise<void> {
  // confirm it exists first
  await getSessionById(sessionId);
  sessionDb.delete(sessionId);
}

export async function joinSession(sessionId: string, sessionPassword: string, role: SessionUserRole): Promise<Readonly<SessionUserSchema>> {
  const session = await getSessionById(sessionId, sessionPassword);
  const user: SessionUserSchema = {
    id: nextUID(),
    role: role
  };
  session.users.push(user);
  return user;
}

export async function getUserForSession(userId: string, sessionId: string): Promise<Readonly<SessionUserSchema>> {
  const session = await getSessionById(sessionId);
  const userIndex = session.users.findIndex(user => user.id === userId);
  if (userIndex < 0) {
    throw new SessionNotFoundError();
  }
  return session.users[userIndex];
}

export async function getSessionForUser(sessionId: string, userId: string): Promise<Readonly<SessionSchema>> {
  const session = await getSessionById(sessionId);

  if (!session.users.find(user => user.id === userId)) {
    throw new SessionNotFoundError();
  }

  return session;
}

export async function getSessionByToken(accessToken: SessionAccessToken, requireRole?: SessionUserRole): Promise<Readonly<SessionSchema>> {
  const tokenParts = accessTokenParts(accessToken);
  if (requireRole !== undefined) {
    if (tokenParts.userRole !== requireRole) {
      throw new SessionRoleDenied();
    }
  }
  return await getSessionForUser(tokenParts.sessionId, tokenParts.userId);
}

export async function updateSession(accessToken: SessionAccessToken, update: Partial<SessionSchema>): Promise<Readonly<SessionSchema>> {
  const session = await getSessionByToken(accessToken, SessionUserRole.Admin);
  const updatedSession = {
    ...session,
    ...update
  };
  sessionDb.set(session.id, updatedSession);
  return updatedSession;
}
