export enum SessionUserRole {
  Display,
  Admin,
  Player
}

export interface SessionUserSchema {
  id: string;
  role: SessionUserRole;
}

export type SessionAccessToken = string;
export interface SessionAccessTokenParts {
  sessionId: string;
  userId: string;
  userRole: SessionUserRole;
}

export function createAccessToken(
  sessionId: string,
  userId: string,
  userRole: SessionUserRole
): SessionAccessToken {
  return `${sessionId}${userId}${userRole}`;
}

export function accessTokenParts(
  accessToken: SessionAccessToken
): SessionAccessTokenParts {
  if (accessToken.length !== 11) {
    throw new Error(`Invalid SessionAccessToken: "${accessToken}".`);
  }
  const id = accessToken.substr(0, 5);
  const user = accessToken.substr(5, 5);
  const role = parseInt(accessToken.substr(-1, 1), 10) as SessionUserRole;
  return {
    sessionId: id,
    userId: user,
    userRole: role
  };
}
