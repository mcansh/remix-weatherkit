import { createCookieSessionStorage } from "@remix-run/node";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
    sameSite: "lax",
    secrets: ["s3cret1"],
    secure: process.env.NODE_ENV === "production",
  },
});

export function getSession(request: Request) {
  let header = request.headers.get("Cookie");
  return sessionStorage.getSession(header);
}
