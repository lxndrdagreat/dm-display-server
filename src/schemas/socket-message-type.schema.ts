
export enum SocketMessageType {
  CreateNewSession,
  NewSessionCreated,

  ConnectToSession,
  SessionConnected,
  SessionConnectionRefused,

  FullState,

  CombatTrackerState,
  CombatTrackerAddCharacter,
  CombatTrackerCharacterAdded,
  CombatTrackerRemoveCharacter,
  CombatTrackerCharacterRemoved,
  CombatTrackerUpdateCharacter,
  CombatTrackerCharacterUpdated,
  CombatTrackerNextTurn,
  CombatTrackerPreviousTurn,
  CombatTrackerActiveCharacter,
  CombatTrackerRound,
  CombatTrackerRequestRestart,
  CombatTrackerRequestClear,
  CombatTrackerUpdateCharacterNPC
}

export enum SessionConnectionRefusedReason {
  SessionNotFound,
  InvalidPermissions
}

export interface SocketMessage {
  type: SocketMessageType;
  payload?: unknown;
}
