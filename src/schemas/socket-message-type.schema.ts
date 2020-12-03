
export enum SocketMessageType {
  ConnectToSession,
  SessionConnected,

  FullState,

  CombatTrackerState,
  CombatTrackerAddCharacter,
  CombatTrackerCharacterAdded,
  CombatTrackerRemoveCharacter,
  CombatTrackerCharacterRemoved,
  CombatTrackerUpdateCharacter,
  CombatTrackerCharacterUpdated
}

export interface SocketMessage {
  type: SocketMessageType;
  payload?: unknown;
}
