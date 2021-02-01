import {SessionSchema} from './session.schema';
import {CombatTrackerSchema} from './combat-tracker.schema';
import {CombatCharacterSchema} from './combat-character.schema';

export type SessionBroadcastType =
  | 'SESSION'
  | 'COMBAT_TRACKER'
  | 'COMBAT_TRACKER_ACTIVE_CHARACTER'
  | 'COMBAT_TRACKER_ROUND'
  | 'CHARACTER'
  | 'CHARACTER_ADD'
  | 'CHARACTER_REMOVE';

export interface ISessionBroadcast<Type extends SessionBroadcastType, PayloadType> {
  sessionId: string;
  type: Type;
  payload: PayloadType;
}

export type SessionBroadcast = ISessionBroadcast<'SESSION', SessionSchema>
  | ISessionBroadcast<'COMBAT_TRACKER', CombatTrackerSchema>
  | ISessionBroadcast<'COMBAT_TRACKER_ACTIVE_CHARACTER', string>
  | ISessionBroadcast<'COMBAT_TRACKER_ROUND', number>
  | ISessionBroadcast<'CHARACTER', CombatCharacterSchema>
  | ISessionBroadcast<'CHARACTER_ADD', CombatCharacterSchema>
  | ISessionBroadcast<'CHARACTER_REMOVE', string>;
