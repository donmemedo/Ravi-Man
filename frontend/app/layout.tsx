import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import localFont from 'next/font/local'
import { PrefsProvider } from './lib'
import './globals.css'

// Self-hosted: Google Fonts isn't reliably reachable from Iran.
const vazir = localFont({ src: './fonts/Vazirmatn.woff2', variable: '--font-vazir', weight: '100 900', display: 'swap' })
const inter = localFont({ src: './fonts/Inter.woff2', variable: '--font-inter', weight: '100 900', display: 'swap' })

export const metadata: Metadata = {
  title: 'Narrative · نریتیو',
  description: 'Your searchable photographic memory — حافظه تصویری قابل جستجو',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Narrative' },
}
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

// Runs before paint so the saved theme/language never flashes.
const boot = `try{var p=JSON.parse(localStorage.getItem('narrative-prefs')||'{}'),t=p.theme||'system',d=document.documentElement;
if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t;
var l=p.lang||'fa';d.lang=l;d.dir=l==='fa'?'rtl':'ltr'}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className={`${vazir.variable} ${inter.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: boot }} /></head>
      <body><PrefsProvider>{children}</PrefsProvider></body>
    </html>
  )
}
