import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { SignJWT, jwtVerify } from 'jose';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: { signIn: '/login' },
  callbacks: {
    authorized: ({ auth }) => !!auth,
  },
  providers: [
    GitHub,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const res = await fetch(`${API_URL}/auth/verifyCredentials`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        if (!res.ok) return null;
        const user = await res.json();
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.avatar_url ?? undefined,
        };
      },
    }),
  ],
  jwt: {
    async encode({ token, secret }) {
      if (!token) throw new Error('encode: missing token');
      const { sub, email, name, picture } = token;
      return new SignJWT({
        email: String(email ?? ''),
        name: String(name ?? ''),
        ...(picture ? { picture: String(picture) } : {}),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(String(sub ?? ''))
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(new TextEncoder().encode(String(secret)));
    },
    async decode({ token, secret }) {
      const { payload } = await jwtVerify(String(token), new TextEncoder().encode(String(secret)));
      return payload;
    },
  },
});
