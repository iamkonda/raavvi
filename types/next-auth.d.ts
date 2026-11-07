import { DefaultSession } from "next-auth";
import { AdminRole } from "@prisma/client";

type RaavviRole = AdminRole | "CUSTOMER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RaavviRole;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: RaavviRole;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: RaavviRole;
    mustChangePassword?: boolean;
  }
}