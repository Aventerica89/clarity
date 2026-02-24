import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { DevButton } from "@/components/dev-button"
import { DevtoolsWidget } from "@/components/devtools-widget"
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
      // iPad Pro 12.9"
      { url: "/pwa/apple-splash-2048-2732.jpg", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2732-2048.jpg", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad Pro 11"
      { url: "/pwa/apple-splash-1668-2388.jpg", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2388-1668.jpg", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad 9th gen
      { url: "/pwa/apple-splash-1536-2048.jpg", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2048-1536.jpg", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad Air / 10th gen
      { url: "/pwa/apple-splash-1640-2360.jpg", media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2360-1640.jpg", media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad Pro 10.5"
      { url: "/pwa/apple-splash-1668-2224.jpg", media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2224-1668.jpg", media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad 8th gen
      { url: "/pwa/apple-splash-1620-2160.jpg", media: "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2160-1620.jpg", media: "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPad mini 6
      { url: "/pwa/apple-splash-1488-2266.jpg", media: "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2266-1488.jpg", media: "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPhone 16 Pro Max
      { url: "/pwa/apple-splash-1320-2868.jpg", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2868-1320.jpg", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone 15 Pro Max / 16 Plus
      { url: "/pwa/apple-splash-1290-2796.jpg", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2796-1290.jpg", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone 14 Pro Max
      { url: "/pwa/apple-splash-1284-2778.jpg", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2778-1284.jpg", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone 14 Plus
      { url: "/pwa/apple-splash-1260-2736.jpg", media: "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2736-1260.jpg", media: "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone 14 / 15 / 16
      { url: "/pwa/apple-splash-1170-2532.jpg", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2532-1170.jpg", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone 15 Pro / 16
      { url: "/pwa/apple-splash-1179-2556.jpg", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2556-1179.jpg", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone 16 Pro
      { url: "/pwa/apple-splash-1206-2622.jpg", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2622-1206.jpg", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone 13 mini / 12 mini / X / XS
      { url: "/pwa/apple-splash-1125-2436.jpg", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2436-1125.jpg", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone XR / 11
      { url: "/pwa/apple-splash-828-1792.jpg", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-1792-828.jpg", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPhone XS Max / 11 Pro Max
      { url: "/pwa/apple-splash-1242-2688.jpg", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2688-1242.jpg", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone 8 Plus / 7 Plus / 6s Plus
      { url: "/pwa/apple-splash-1242-2208.jpg", media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-2208-1242.jpg", media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
      // iPhone SE / 8 / 7 / 6s
      { url: "/pwa/apple-splash-750-1334.jpg", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-1334-750.jpg", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
      // iPhone SE 1st gen / iPod touch
      { url: "/pwa/apple-splash-640-1136.jpg", media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/pwa/apple-splash-1136-640.jpg", media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" },
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
          <Toaster />
          <DevButton />
        </ThemeProvider>
        <DevtoolsWidget />
      </body>
    </html>
  )
}
