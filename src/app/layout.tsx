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
    startupImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/favicon-196.png", sizes: "196x196", type: "image/png" }],
    apple: [{ url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
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
