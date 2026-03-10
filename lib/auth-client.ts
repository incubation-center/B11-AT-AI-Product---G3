import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
   baseURL: process.env.NEXT_PUBLIC_BASE_URL // Let better-auth infer or use env, avoiding hardcoded preview URLs
});