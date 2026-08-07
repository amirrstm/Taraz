export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Taraz</h1>
      <form action="/api/login" method="post" className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          autoFocus
          className="rounded-xl bg-neutral-900 px-4 py-4 text-lg outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
        />
        {error && <p className="text-sm text-red-400">Wrong password.</p>}
        <button className="rounded-xl bg-neutral-100 px-4 py-4 text-lg font-medium text-neutral-900">
          Sign in
        </button>
      </form>
    </main>
  )
}
