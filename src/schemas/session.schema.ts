import {SessionUserSchema} from './session-user.schema';

export interface SessionSchema {
  id: string;
  password: string;
  users: SessionUserSchema[];
}
