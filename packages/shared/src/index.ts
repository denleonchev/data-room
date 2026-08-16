export interface Health {
  status: "ok";
  service: string;
}

/** Shape of the signed-in user returned by `GET /me`. */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
}
