import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'MS Rewards Automator',
  description: 'Otomatisasi harian Bing Search dan MSN Read',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
