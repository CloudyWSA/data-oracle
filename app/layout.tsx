import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"
export const metadata: Metadata = {
  title: "Data Oracle",
  description: "League of Legends Pro Data",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <Analytics />
      <body>{children}</body>
    </html>

  )
}
