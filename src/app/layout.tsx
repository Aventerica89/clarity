import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import { ThemeProvider } from "next-themes"
import { DevButton } from "@/components/dev-button"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
}

export const metadata: Metadata = {
  title: "Clarity",
  description: "Your AI-powered productivity hub",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clarity",
    startupImage: [
      // iPad Pro 12.9" — portrait + landscape
      { url: "/pwa/apple-splash-2048-2732.jpg", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2048-2732.jpg", media: "(device-width: 1366px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad Air / iPad 10th gen — portrait + landscape
      { url: "/pwa/apple-splash-1640-2360.jpg", media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-1640-2360.jpg", media: "(device-width: 1180px) and (device-height: 820px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad Pro 10.5" / 11" landscape
      { url: "/pwa/apple-splash-2224-1668.jpg", media: "(device-width: 1112px) and (device-height: 834px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      { url: "/pwa/apple-splash-2224-1668.jpg", media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      // iPad 9th gen — portrait + landscape
      { url: "/pwa/apple-splash-1536-2048.jpg", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-1536-2048.jpg", media: "(device-width: 1024px) and (device-height: 768px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad mini 6 — portrait + landscape
      { url: "/pwa/apple-splash-1488-2266.jpg", media: "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-1488-2266.jpg", media: "(device-width: 1133px) and (device-height: 744px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad landscape (2160x1620)
      { url: "/pwa/apple-splash-2160-1620.jpg", media: "(device-width: 1080px) and (device-height: 810px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      { url: "/pwa/apple-splash-2160-1620.jpg", media: "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      // iPhone 14 Plus / Pro Max — portrait + landscape
      { url: "/pwa/apple-splash-1260-2736.jpg", media: "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-1260-2736.jpg", media: "(device-width: 912px) and (device-height: 420px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone SE / iPhone 8 — portrait + landscape
      { url: "/pwa/apple-splash-1334-750.jpg", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-1334-750.jpg", media: "(device-width: 667px) and (device-height: 375px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/pwa/favicon-196.png", sizes: "196x196", type: "image/png" }],
    apple: [{ url: "/pwa/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <DevButton />
        </ThemeProvider>
        <Script
          src="https://devtools.jbcloud.app/widget.js"
          data-project="ohnfqin4-qsi1-w2ez"
          data-pin="21bbda1d1794b7a4ae9bb53822b5787bc637d91e9131847a9ac86572bcdd3de0"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
