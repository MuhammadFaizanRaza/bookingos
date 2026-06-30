import Link from 'next/link';
import './globals.css';

// Global fallback for unmatched, non-localized routes. Owns its own
// <html>/<body> because the root layout is a pass-through.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            gap: '1rem',
          }}
        >
          <h1 style={{ fontSize: '3rem', fontWeight: 700 }}>404</h1>
          <p style={{ color: '#666' }}>This page could not be found.</p>
          <Link href="/en" style={{ color: '#7C3AED', fontWeight: 600 }}>
            Go to SalonOS
          </Link>
        </div>
      </body>
    </html>
  );
}
