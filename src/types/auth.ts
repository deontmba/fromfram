export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface SessionResult {
  userId: string;
}

export interface SessionError {
  error: 'CONFIG_MISSING' | 'UNAUTHENTICATED';
}

export type SessionResponse = SessionResult | SessionError;