import { SignJWT } from "jose";
console.log(await new SignJWT({ email: "rajasha@gmail.com", name: "x" })
  .setSubject("1bc7248c-141b-49c7-8ab8-5b340d46e37e").setIssuedAt().setExpirationTime("15m")
  .setProtectedHeader({ alg: "HS256" })
  .sign(new TextEncoder().encode(process.env.AUTH_SECRET)));
