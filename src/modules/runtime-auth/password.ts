import { hashPassword, verifyPassword } from "better-auth/crypto";

import type { PasswordHasher } from "./contracts";

export const betterAuthPasswordHasher: PasswordHasher = {
  hash: hashPassword,
  verify: verifyPassword,
};
