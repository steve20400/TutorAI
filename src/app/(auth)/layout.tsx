export default function LayoutAuth({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      {children}
    </main>
  )
}
