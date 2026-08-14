import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        <Label htmlFor="password" className="sr-only">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          autoFocus
          // `h-auto` overrides the primitive's fixed height, which would shrink
          // this deliberately large tap target. `md:text-lg` keeps the field at
          // 18px on every width: below 16px, iOS Safari zooms the viewport on
          // focus.
          className="h-auto rounded-xl px-4 py-4 text-lg md:text-lg"
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>Wrong password.</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="h-auto rounded-xl px-4 py-4 text-lg font-medium">
          Sign in
        </Button>
      </form>
    </main>
  )
}
