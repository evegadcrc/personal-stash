import { signIn } from "@/auth"

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-900/15 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-blue-900/15 blur-[100px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-sm">
            <span className="text-2xl">✦</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Personal Stash</h1>
            <p className="mt-1 text-sm text-zinc-500">Your digital memory</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-zinc-400">
            Sign in
          </h2>

          {/* Disabled email/password — placeholder for future */}
          <div className="mb-5 flex flex-col gap-3">
            <div className="relative">
              <input
                type="email"
                placeholder="Email address"
                disabled
                className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 pr-10 text-sm text-zinc-600 placeholder-zinc-600 outline-none cursor-not-allowed"
              />
              <LockIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700" />
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="Password"
                disabled
                className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 pr-10 text-sm text-zinc-600 placeholder-zinc-600 outline-none cursor-not-allowed"
              />
              <LockIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700" />
            </div>
            <p className="text-center text-xs text-zinc-600">
              Email &amp; password sign-in coming soon
            </p>
          </div>

          {/* Divider */}
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">or continue with</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Google sign-in */}
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: callbackUrl ?? "/" })
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm font-medium text-zinc-200 shadow-sm transition-all hover:border-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-100 active:scale-[0.98]"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-700">
          Your personal space. No ads. No tracking.
        </p>
      </div>
    </div>
  )
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}
