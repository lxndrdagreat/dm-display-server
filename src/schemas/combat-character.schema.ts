export interface NPCDetails {
  maxHealth: number;
  health: number;
  armorClass: number;
  url?: string;
}

export enum CharacterConditions {
  Blinded,
  Charmed,
  Deafened,
  Frightened,
  Grappled,
  Incapacitated,
  Invisible,
  Paralyzed,
  Petrified,
  Poisoned,
  Prone,
  Restrained,
  Stunned,
  Unconcious
}

export interface CombatCharacterSchema {
  id: string;
  displayName: string;
  adminName: string;
  nameVisible: boolean;
  active: boolean;
  roll: number;
  conditions: CharacterConditions[];
  npc: NPCDetails | null;
}

export interface AddCharacterRequest {
  token: string;
  character: Omit<CombatCharacterSchema, 'id'>;
}
