import { z } from "zod";

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

// Password length matches Better Auth's own minimum, so the form rejects exactly
// what the server would.
export const signInSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(1, "Name is required"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export * from "./node";
export * from "./node-path";
