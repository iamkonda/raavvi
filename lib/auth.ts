
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  pages: {
    signIn: "/admin/login",
  },

  providers: [
    CredentialsProvider({
      name: "Email and Password",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();

        // Admin authentication
        const admin = await prisma.adminUser.findUnique({
          where: { email },
        });

        if (admin) {
          if (!admin.isActive) return null;

          const passwordMatches = await bcrypt.compare(
            credentials.password,
            admin.passwordHash
          );

          if (!passwordMatches) return null;

          return {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            mustChangePassword: false,
          };
        }

        // Customer authentication
        const customer = await prisma.customer.findUnique({
          where: { email },
        });

        if (
          !customer ||
          customer.status !== "ACTIVE" ||
          !customer.passwordHash
        ) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          credentials.password,
          customer.passwordHash
        );

        if (!passwordMatches) return null;

        if (customer.mustChangePassword) {
          const expiry = customer.temporaryPasswordExpiresAt;

          if (!expiry || expiry.getTime() <= Date.now()) {
            return null;
          }
        }

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          role: "CUSTOMER",
          mustChangePassword: customer.mustChangePassword,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }

      // Recheck the database when the client requests a session update.
      if (trigger === "update" && token.role === "CUSTOMER" && token.id) {
        const customer = await prisma.customer.findUnique({
          where: { id: token.id as string },
          select: {
            status: true,
            mustChangePassword: true,
          },
        });

        if (customer && customer.status === "ACTIVE") {
          token.mustChangePassword = customer.mustChangePassword;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as NonNullable<
          typeof session.user.role
        >;
        session.user.mustChangePassword =
          token.mustChangePassword === true;
      }

      return session;
    },
  },
};
