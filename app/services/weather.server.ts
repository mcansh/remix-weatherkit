import fsp from "node:fs/promises";
import path from "node:path";
import { sign } from "jsonwebtoken";

export async function getToken() {
  let WEATHERKIT_PRIVATE_KEY = process.env.WEATHERKIT_PRIVATE_KEY;

  if (!WEATHERKIT_PRIVATE_KEY) {
    throw new Error("WEATHERKIT_PRIVATE_KEY is not defined");
  }

  if (!process.env.APPLE_APP_ID) {
    throw new Error("APPLE_APP_ID is not defined");
  }
  if (!process.env.APPLE_TEAM_ID) {
    throw new Error("APPLE_TEAM_ID is not defined");
  }
  if (!process.env.APPLE_KEY_ID) {
    throw new Error("APPLE_KEY_ID is not defined");
  }

  let jwtid = `${process.env.APPLE_TEAM_ID}.${process.env.APPLE_APP_ID}`;

  // @ts-expect-error header.id is needed but doesnt exist in types
  let jwt = sign(
    {
      subject: process.env.APPLE_APP_ID,
    },
    WEATHERKIT_PRIVATE_KEY,
    {
      jwtid,
      issuer: process.env.APPLE_TEAM_ID,
      expiresIn: 60,
      keyid: process.env.APPLE_KEY_ID,
      algorithm: "ES256",
      header: {
        id: jwtid,
      },
    }
  );

  return `Bearer ${jwt}`;
}
