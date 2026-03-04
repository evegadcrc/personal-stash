import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      const allowed = (process.env.ALLOWED_EMAILS ?? "")
        .split(",").map(e => e.trim()).filter(Boolean)
      return allowed.length === 0 || allowed.includes(user.email ?? "")
    },
  },
})
