import React from "react"
import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains'
});

export const metadata: Metadata = {
  title: 'Multia - Prompt Studio',
  description: 'Professional JSON prompt generator Describe your vision, get a detailed AI-ready prompt.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/ibg2dis.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Ubuntu is the approved Poster Studio typeface. loadUbuntuPosterFonts()
            awaits 400/500/700 and blocks the poster export if any are missing. */}
        <link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
