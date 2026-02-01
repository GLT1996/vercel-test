import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface SessionPayload extends JWTPayload {
  user?: {
    id: string;
    username: string;
  };
  expires?: Date;
}

const secretKey = process.env.JWT_SECRET;
// It's crucial to ensure the secret key is defined and has a sufficient length
if (!secretKey || secretKey.length < 32) {
  throw new Error("The JWT_SECRET environment variable must be set and be at least 32 characters long.");
}
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (e) {
    const error = e as Error;
    // Log the error for debugging purposes
    console.log(`Failed to verify JWT: ${error.name} - ${error.message}`);
    return null;
  }
}

