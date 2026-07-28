import type { DefaultSession } from "next-auth";

import type { AppRole } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string;
      role: AppRole;
      username: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    discordId?: string;
    role?: AppRole;
    username?: string;
  }
}
