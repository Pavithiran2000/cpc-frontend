import { PlatformAuthProvider } from '@/providers/PlatformAuthContext'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // QueryProvider and ThemeProvider are already in the root layout.
  // We only add PlatformAuthProvider here to scope it to /platform routes.
  return <PlatformAuthProvider>{children}</PlatformAuthProvider>
}
