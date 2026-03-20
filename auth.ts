import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      // Auto-create or update user record on every sign-in
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name ?? undefined,
          avatar: user.image ?? undefined,
        },
        create: {
          email: user.email,
          name: user.name ?? undefined,
          avatar: user.image ?? undefined,
        },
      });
      return true;
    },
  },
});
