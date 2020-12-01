
export enum SessionUserRole {
  Display,
  Admin,
  Player
}

export interface SessionUserSchema {
  id: string;
  role: SessionUserRole;
}
