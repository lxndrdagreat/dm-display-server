import {SessionUserSchema} from './session-user.schema';
import {CombatTrackerSchema} from './combat-tracker.schema';

export enum ActiveScreen {
  CombatTracker
}

export interface SessionSchema {
  id: string;
  password: string;
  users: SessionUserSchema[];
  activeScreen: ActiveScreen;
  combatTracker?: CombatTrackerSchema;
}
