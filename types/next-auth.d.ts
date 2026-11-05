import type { DefaultSession } from "@auth/core/types";
import type { Role } from "@/lib/types";

declare module "@auth/core/types" {
  interface User {
    role: Role;
    passwordVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      mfaEnabled?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    mfaEnabled?: boolean;
    passwordVersion?: number;
  }
}
