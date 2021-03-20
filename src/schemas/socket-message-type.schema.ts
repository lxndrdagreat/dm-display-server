export enum SocketMessageType {
  CreateNewSession,
  NewSessionCreated,

  ConnectToSession,
  SessionConnected,
  SessionConnectionRefused,
  Reconnect,

  Heartbeat,

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

// https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#status_codes
// 4000-4999 are reserved for application use
export enum SocketCloseStatusCode {
  SessionNotFound = 4000,
  InvalidRolePermissions = 4001
}

export enum SessionConnectionRefusedReason {
  SessionNotFound,
  InvalidPermissions
}

export interface SocketMessage {
  type: SocketMessageType;
  payload?: unknown;
}
