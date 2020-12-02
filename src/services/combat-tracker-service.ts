import {CombatCharacterSchema} from '../schemas/combat-character.schema';
import {getSessionByToken, updateSession} from './session-service';
import {SessionAccessToken} from '../schemas/session-user.schema';
import {CombatTrackerSchema, initCombatTrackerState} from '../schemas/combat-tracker.schema';
import {nextUID} from './uid-service';

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

export async function getCombatTrackerForSession(accessToken: SessionAccessToken): Promise<Readonly<CombatTrackerSchema>> {
  const session = await getSessionByToken(accessToken);
  if (!session.combatTracker) {
    throw new CombatTrackerDoesNotExist();
  }
  return session.combatTracker;
}

export async function updateCombatTracker(accessToken: SessionAccessToken, update: Partial<CombatTrackerSchema>): Promise<Readonly<CombatTrackerSchema>> {
  const tracker = await getCombatTrackerForSession(accessToken);
  const updatedTracker = {
    ...tracker,
    ...update
  };
  await updateSession(accessToken, {
    combatTracker: updatedTracker
  });
  return updatedTracker;
}

export async function resetCombatTracker(accessToken: SessionAccessToken): Promise<Readonly<CombatTrackerSchema>> {
  return await updateCombatTracker(accessToken, initCombatTrackerState());
}

export async function resetCombatRounds(accessToken: SessionAccessToken): Promise<Readonly<CombatTrackerSchema>> {
  return await updateCombatTracker(accessToken, {
    round: 0
  });
}

export async function nextTurn(accessToken: SessionAccessToken): Promise<Readonly<CombatTrackerSchema>> {
  const tracker = await getCombatTrackerForSession(accessToken);
  if (tracker.characters.length === 0) {
    // do nothing
    return tracker;
  }
  const characters = tracker.characters.slice();
  // sort by initiative roll
  characters.sort(((a, b) => a.roll - b.roll));
  if (!tracker.activeCharacterId) {
    return await updateCombatTracker(accessToken, {
      activeCharacterId: characters[0].id
    });
  }
  let activeCharacterIndex = characters.findIndex(character => character.id === tracker.activeCharacterId);
  let newRound = false;
  activeCharacterIndex += 1;
  if (activeCharacterIndex >= characters.length) {
    activeCharacterIndex = 0;
    newRound = true;
  }
  return await updateCombatTracker(accessToken, {
    activeCharacterId: characters[activeCharacterIndex].id,
    round: newRound ? tracker.round + 1 : tracker.round
  });
}

export async function previousTurn(accessToken: SessionAccessToken): Promise<Readonly<CombatTrackerSchema>> {
  const tracker = await getCombatTrackerForSession(accessToken);
  if (tracker.characters.length === 0) {
    // do nothing
    return tracker;
  }
  const characters = tracker.characters.slice();
  // sort by initiative roll
  characters.sort(((a, b) => a.roll - b.roll));
  if (!tracker.activeCharacterId) {
    return await updateCombatTracker(accessToken, {
      activeCharacterId: characters[0].id
    });
  }
  let activeCharacterIndex = characters.findIndex(character => character.id === tracker.activeCharacterId);
  let newRound = false;
  activeCharacterIndex -= 1;
  if (activeCharacterIndex < 0) {
    activeCharacterIndex = characters.length - 1;
    newRound = true;
  }
  return await updateCombatTracker(accessToken, {
    activeCharacterId: characters[activeCharacterIndex].id,
    round: Math.max(newRound ? tracker.round - 1 : tracker.round, 0)
  });
}

export async function updateCharacter(accessToken: SessionAccessToken, characterId: string, characterUpdate: Partial<CombatCharacterSchema>): Promise<Readonly<CombatCharacterSchema>> {
  const tracker = await getCombatTrackerForSession(accessToken);
  const characterIndex = tracker.characters.findIndex(character => character.id === characterId);
  if (characterIndex < 0) {
    throw new CombatCharacterDoesNotExist();
  }
  const updatedCharacter: CombatCharacterSchema = {
    ...tracker.characters[characterIndex],
    ...characterUpdate
  };

  await updateCombatTracker(accessToken, {
    characters: tracker.characters.map((character) => {
      if (character.id === characterId) {
        return updatedCharacter;
      }
      return character;
    })
  });

  return updatedCharacter;
}

export async function addCharacter(accessToken: SessionAccessToken, character: Omit<CombatCharacterSchema, 'id'>): Promise<Readonly<CombatCharacterSchema>> {
  const tracker = await getCombatTrackerForSession(accessToken);
  // TODO: validate character model
  const newCharacter: CombatCharacterSchema = {
    ...character,
    id: nextUID()
  };

  const characters = tracker.characters.slice();
  characters.push(newCharacter);
  characters.sort(((a, b) => a.roll - b.roll));

  await updateCombatTracker(accessToken, {
    characters: characters
  });

  return newCharacter;
}

export async function removeCharacter(accessToken: SessionAccessToken, characterId: string): Promise<Readonly<CombatTrackerSchema>> {
  const tracker = await getCombatTrackerForSession(accessToken);
  const index = tracker.characters.findIndex(character => character.id === characterId);
  if (index < 0) {
    throw new CombatCharacterDoesNotExist();
  }
  const characters = tracker.characters.slice();
  characters.splice(index, 1);
  return await updateCombatTracker(accessToken, {
    characters: characters
  });
}
