import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { env } from '../config/env';
import { SESSION_CONSTANTS } from '../config/constants';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface TokenPayload extends JWTPayload {
  userId: string;
  sessionId: string;
}

export async function signToken(payload: Pick<TokenPayload, 'userId' | 'sessionId'>): Promise<string> {
  return new SignJWT({ userId: payload.userId, sessionId: payload.sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_CONSTANTS.JWT_EXPIRY_STR)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as TokenPayload;
}
