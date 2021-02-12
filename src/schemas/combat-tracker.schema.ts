import { CombatCharacterSchema } from './combat-character.schema';

export interface CombatTrackerSchema {
  characters: CombatCharacterSchema[];
  activeCharacterId: string | null;
  round: number;
}

export function initCombatTrackerState(): CombatTrackerSchema {
  return {
    characters: [],
    activeCharacterId: null,
    round: 1
  };
}
