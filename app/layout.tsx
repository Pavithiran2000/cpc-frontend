import type { Metadata } from 'next'
import { Syne, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '700', '800'],
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
  weight: ['400', '500', '600'],
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: {
    default: 'CPC Station Manager',
    template: '%s | CPC Station Manager',
  },
  description: 'Multi-tenant management platform for CPC filling stations',
}

// Inline script applied before first paint to eliminate FOUC.
// Reads localStorage and applies the correct class to <html> synchronously.
const themeInitScript = `(function(){try{var s=localStorage.getItem('theme')||'dark';var r=s==='system'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):s==='light'?'light':'dark';document.documentElement.classList.add(r);document.documentElement.style.colorScheme=r;}catch(e){document.documentElement.classList.add('dark');}})()`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${syne.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="h-full bg-background font-sans antialiased" suppressHydrationWarning>
        {/* Theme init must be first in body — runs synchronously before paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
