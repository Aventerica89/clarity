import type { Metadata } from "next"
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

export const metadata: Metadata = {
  title: "Clarity",
  description: "Your AI-powered productivity hub",
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
          data-pin="YOUR_PIN_HASH"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
