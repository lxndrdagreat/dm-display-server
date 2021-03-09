import { SessionBroadcast } from '../schemas/session-broadcast.schema';
import { ActiveScreen, SessionSchema } from '../schemas/session.schema';
import { nextUID } from './uid-service';
import {
  CombatTrackerSchema,
  initCombatTrackerState
} from '../schemas/combat-tracker.schema';
import {
  accessTokenParts,
  SessionAccessToken,
  SessionUserRole,
  SessionUserSchema
} from '../schemas/session-user.schema';
import {
  CombatCharacterSchema,
  NPCDetails
} from '../schemas/combat-character.schema';

export type SessionBroadcastSubscriberFunction = (
  message: SessionBroadcast
) => Promise<void>;
export type UnsubscribeFunction = () => void;

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

export class CombatTrackerDoesNotExist extends Error {
  constructor() {
    super('Combat Tracker does not exist.');
  }
}

export class CombatCharacterDoesNotExist extends Error {
  constructor() {
    super('Character does not exist in Combat Tracker.');
  }
}

export class SessionService {
  private subscribers: SessionBroadcastSubscriberFunction[] = [];
  // Using an in-memory store for now
  private sessionDb = new Map<string, SessionSchema>();

  subscribe(sub: SessionBroadcastSubscriberFunction): UnsubscribeFunction {
    if (this.subscribers.includes(sub)) {
      throw new Error('Already subscribed');
    }

    this.subscribers.push(sub);

    return (): void => {
      const index = this.subscribers.indexOf(sub);
      if (index >= 0) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private broadcast(message: SessionBroadcast): void {
    for (const sub of this.subscribers) {
      sub(message).catch((err) => {
        console.log('Uncaught Error in Broadcast Subscriber:', err);
      });
    }
  }

  private async getSessionById(
    sessionId: string,
    sessionPassword?: string
  ): Promise<SessionSchema> {
    const session = this.sessionDb.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }
    if (sessionPassword && sessionPassword !== session.password) {
      throw new SessionNotFoundError();
    }
    return session;
  }

  async createSession(password: string): Promise<Readonly<SessionSchema>> {
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

    this.sessionDb.set(sessionId, session);
    return session;
  }

  async removeSession(sessionId: string): Promise<void> {
    // confirm it exists first
    await this.getSessionById(sessionId);
    this.sessionDb.delete(sessionId);
  }

  async joinSession(
    sessionId: string,
    sessionPassword: string,
    role: SessionUserRole
  ): Promise<Readonly<SessionUserSchema>> {
    const session = await this.getSessionById(sessionId, sessionPassword);
    const user: SessionUserSchema = {
      id: nextUID(),
      role: role
    };
    session.users.push(user);
    return user;
  }

  async getUserForSession(
    userId: string,
    sessionId: string
  ): Promise<Readonly<SessionUserSchema>> {
    const session = await this.getSessionById(sessionId);
    const userIndex = session.users.findIndex((user) => user.id === userId);
    if (userIndex < 0) {
      throw new SessionNotFoundError();
    }
    return session.users[userIndex];
  }

  async getSessionForUser(
    sessionId: string,
    userId: string
  ): Promise<Readonly<SessionSchema>> {
    const session = await this.getSessionById(sessionId);

    if (!session.users.find((user) => user.id === userId)) {
      throw new SessionNotFoundError();
    }

    return session;
  }

  async getSessionByToken(
    accessToken: SessionAccessToken,
    requireRole?: SessionUserRole
  ): Promise<Readonly<SessionSchema>> {
    const tokenParts = accessTokenParts(accessToken);
    if (requireRole !== undefined) {
      if (tokenParts.userRole !== requireRole) {
        throw new SessionRoleDenied();
      }
    }
    return await this.getSessionForUser(
      tokenParts.sessionId,
      tokenParts.userId
    );
  }

  async updateSession(
    accessToken: SessionAccessToken,
    update: Partial<SessionSchema>
  ): Promise<Readonly<SessionSchema>> {
    const session = await this.getSessionByToken(
      accessToken,
      SessionUserRole.Admin
    );
    const updatedSession = {
      ...session,
      ...update
    };
    this.sessionDb.set(session.id, updatedSession);
    return updatedSession;
  }

  async getCombatTrackerForSession(
    accessToken: SessionAccessToken
  ): Promise<Readonly<CombatTrackerSchema>> {
    const session = await this.getSessionByToken(accessToken);
    if (!session.combatTracker) {
      throw new CombatTrackerDoesNotExist();
    }
    return session.combatTracker;
  }

  async updateCombatTracker(
    accessToken: SessionAccessToken,
    update: Partial<CombatTrackerSchema>
  ): Promise<Readonly<CombatTrackerSchema>> {
    const tracker = await this.getCombatTrackerForSession(accessToken);
    const updatedTracker = {
      ...tracker,
      ...update
    };
    await this.updateSession(accessToken, {
      combatTracker: updatedTracker
    });
    return updatedTracker;
  }

  async resetCombatTracker(
    accessToken: SessionAccessToken
  ): Promise<Readonly<CombatTrackerSchema>> {
    const newTracker = await this.updateCombatTracker(
      accessToken,
      initCombatTrackerState()
    );
    this.broadcast({
      type: 'COMBAT_TRACKER',
      sessionId: accessTokenParts(accessToken).sessionId,
      payload: newTracker
    });
    return newTracker;
  }

  async restartCombatRounds(
    accessToken: SessionAccessToken
  ): Promise<Readonly<CombatTrackerSchema>> {
    const tracker = await this.getCombatTrackerForSession(accessToken);
    const characters = tracker.characters.slice();
    characters.sort((a, b) => b.roll - a.roll);

    const updatedTracker = await this.updateCombatTracker(accessToken, {
      round: 1,
      activeCharacterId: characters.length > 0 ? characters[0].id : null
    });

    this.broadcast({
      type: 'COMBAT_TRACKER',
      sessionId: accessTokenParts(accessToken).sessionId,
      payload: updatedTracker
    });

    return updatedTracker;
  }

  async nextTurn(
    accessToken: SessionAccessToken
  ): Promise<Readonly<CombatTrackerSchema>> {
    const tracker = await this.getCombatTrackerForSession(accessToken);
    if (tracker.characters.length === 0) {
      // do nothing
      return tracker;
    }
    const characters = tracker.characters.slice();
    // sort by initiative roll high-to-low
    characters.sort((a, b) => b.roll - a.roll);

    // no active character, so start with the 1st one
    if (!tracker.activeCharacterId) {
      this.broadcast({
        sessionId: accessTokenParts(accessToken).sessionId,
        type: 'COMBAT_TRACKER_ACTIVE_CHARACTER',
        payload: characters[0].id
      });

      return await this.updateCombatTracker(accessToken, {
        activeCharacterId: characters[0].id
      });
    }

    let activeCharacterIndex = characters.findIndex(
      (character) => character.id === tracker.activeCharacterId
    );
    let newRound = false;
    activeCharacterIndex += 1;
    if (activeCharacterIndex >= characters.length) {
      activeCharacterIndex = 0;
      newRound = true;
    }
    const round = newRound ? tracker.round + 1 : tracker.round;

    this.broadcast({
      sessionId: accessTokenParts(accessToken).sessionId,
      type: 'COMBAT_TRACKER_ROUND',
      payload: round
    });

    this.broadcast({
      sessionId: accessTokenParts(accessToken).sessionId,
      type: 'COMBAT_TRACKER_ACTIVE_CHARACTER',
      payload: characters[activeCharacterIndex].id
    });

    return await this.updateCombatTracker(accessToken, {
      activeCharacterId: characters[activeCharacterIndex].id,
      round: round
    });
  }

  async previousTurn(
    accessToken: SessionAccessToken
  ): Promise<Readonly<CombatTrackerSchema>> {
    const tracker = await this.getCombatTrackerForSession(accessToken);
    if (tracker.characters.length === 0) {
      // do nothing
      return tracker;
    }
    const characters = tracker.characters.slice();
    // sort by initiative roll
    characters.sort((a, b) => b.roll - a.roll);
    if (!tracker.activeCharacterId) {
      return await this.updateCombatTracker(accessToken, {
        activeCharacterId: characters[0].id
      });
    }
    let activeCharacterIndex = characters.findIndex(
      (character) => character.id === tracker.activeCharacterId
    );
    let newRound = false;
    activeCharacterIndex -= 1;
    if (activeCharacterIndex < 0) {
      activeCharacterIndex = characters.length - 1;
      newRound = true;
    }
    return await this.updateCombatTracker(accessToken, {
      activeCharacterId: characters[activeCharacterIndex].id,
      round: Math.max(newRound ? tracker.round - 1 : tracker.round, 0)
    });
  }

  async updateCharacter(
    accessToken: SessionAccessToken,
    characterId: string,
    characterUpdate: Partial<CombatCharacterSchema>
  ): Promise<Readonly<CombatCharacterSchema>> {
    const tracker = await this.getCombatTrackerForSession(accessToken);
    const characterIndex = tracker.characters.findIndex(
      (character) => character.id === characterId
    );
    if (characterIndex < 0) {
      throw new CombatCharacterDoesNotExist();
    }
    const updatedCharacter: CombatCharacterSchema = {
      ...tracker.characters[characterIndex],
      ...characterUpdate
    };

    await this.updateCombatTracker(accessToken, {
      characters: tracker.characters.map((character) => {
        if (character.id === characterId) {
          return updatedCharacter;
        }
        return character;
      })
    });

    this.broadcast({
      sessionId: accessTokenParts(accessToken).sessionId,
      type: 'CHARACTER',
      payload: updatedCharacter
    });

    return updatedCharacter;
  }

  async updateCharacterNPCBlock(
    accessToken: SessionAccessToken,
    characterId: string,
    npcDetails: Partial<NPCDetails>
  ): Promise<Readonly<CombatCharacterSchema>> {
    const tracker = await this.getCombatTrackerForSession(accessToken);
    const characterIndex = tracker.characters.findIndex(
      (character) => character.id === characterId
    );
    if (characterIndex < 0) {
      throw new CombatCharacterDoesNotExist();
    }
    const details: NPCDetails = tracker.characters[characterIndex].npc || {
      url: '',
      maxHealth: 0,
      health: 0,
      armorClass: 0,
      attacks: []
    };

    return this.updateCharacter(accessToken, characterId, {
      ...tracker.characters[characterIndex],
      npc: {
        ...details,
        ...npcDetails
      }
    });
  }

  async addCharacter(
    accessToken: SessionAccessToken,
    character: Omit<CombatCharacterSchema, 'id'>
  ): Promise<Readonly<CombatCharacterSchema>> {
    const tracker = await this.getCombatTrackerForSession(accessToken);
    // TODO: validate character model
    const newCharacter: CombatCharacterSchema = {
      ...character,
      id: nextUID(),
      conditions: []
    };

    const characters = tracker.characters.slice();
    characters.push(newCharacter);
    characters.sort((a, b) => b.roll - a.roll);

    // TODO: if that was the 1st character added, make them the active character

    await this.updateCombatTracker(accessToken, {
      characters: characters
    });

    this.broadcast({
      sessionId: accessTokenParts(accessToken).sessionId,
      type: 'CHARACTER_ADD',
      payload: newCharacter
    });

    return newCharacter;
  }

  async removeCharacter(
    accessToken: SessionAccessToken,
    characterId: string
  ): Promise<Readonly<CombatTrackerSchema>> {
    const tracker = await this.getCombatTrackerForSession(accessToken);
    const index = tracker.characters.findIndex(
      (character) => character.id === characterId
    );
    if (index < 0) {
      throw new CombatCharacterDoesNotExist();
    }
    const characters = tracker.characters.slice();
    characters.splice(index, 1);

    this.broadcast({
      sessionId: accessTokenParts(accessToken).sessionId,
      type: 'CHARACTER_REMOVE',
      payload: characterId
    });

    // if that character was the active character, set the next active character
    let activeCharacter = tracker.activeCharacterId;
    if (characterId === activeCharacter) {
      if (index >= characters.length) {
        if (characters.length > 0) {
          activeCharacter = characters[0].id;
        } else {
          activeCharacter = null;
        }
      } else {
        activeCharacter = characters[index].id;
      }
      this.broadcast({
        sessionId: accessTokenParts(accessToken).sessionId,
        type: 'COMBAT_TRACKER_ACTIVE_CHARACTER',
        payload: activeCharacter
      });
    }

    return await this.updateCombatTracker(accessToken, {
      characters: characters,
      activeCharacterId: activeCharacter
    });
  }
}
