import {customAlphabet} from 'nanoid';
import {SessionSchema} from '../schemas/session.schema';
import {SessionUserRole, SessionUserSchema} from '../schemas/session-user.schema';

// custom nanoid generator
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 5);

// Using an in-memory store for now
const sessionDb = new Map<string, SessionSchema>();

export class SessionNotFoundError extends Error {
  constructor() {
    super('Session not found.');
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
  const sessionId = nanoid();

  const session: SessionSchema = {
    id: sessionId,
    // TODO: hash this password
    password: password,
    // TODO: include initial admin user
    users: []
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
    id: nanoid(),
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


