
export interface NPCDetails {
  maxHealth: number;
  health: number;
  armorClass: number;
  url?: string;
}

export interface CombatCharacterSchema {
  id: string;
  displayName: string;
  adminName: string;
  nameVisible: boolean;
  active: boolean;
  roll: number;
  npc: NPCDetails | null;
}

export interface AddCharacterRequest {
  token: string;
  character: Omit<CombatCharacterSchema, 'id'>;
}
