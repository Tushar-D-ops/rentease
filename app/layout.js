import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { dark } from '@clerk/themes';

export const metadata = {
  title: 'RentEase – Smart Student Accommodation',
  description: 'Find verified PGs near your college. Smart billing, QR entry, real-time analytics.',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en">
        <head>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        </head>
        <body className="font-dm bg-[#050810] text-white min-h-screen antialiased">
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background:'#161b22', color:'#c9d1d9', border:'1px solid #30363d', borderRadius:'10px' },
              success: { iconTheme: { primary:'#06d6a0', secondary:'#161b22' } },
              error:   { iconTheme: { primary:'#ff4d6d', secondary:'#161b22' } },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}