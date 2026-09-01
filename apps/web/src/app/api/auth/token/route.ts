import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function GET() {
  const store = await cookies();
  const sessionToken =
    store.get('authjs.session-token')?.value ?? store.get('__Secure-authjs.session-token')?.value;
  if (!sessionToken) return Response.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { payload } = await jwtVerify(sessionToken, secret);
    const token = await new SignJWT({ email: payload.email, name: payload.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(payload.sub ?? ''))
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);
    return Response.json({ token });
  } catch {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
}
