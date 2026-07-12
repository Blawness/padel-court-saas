import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth-config";

// Better Auth owns /api/auth/sign-in/*, /sign-up/*, /sign-out, /callback/*, /get-session…
export const { GET, POST } = toNextJsHandler(auth);
