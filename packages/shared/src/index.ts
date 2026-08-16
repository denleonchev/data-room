export interface Health {
  status: "ok";
  service: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
}
