import type { ReactNode } from 'react';

// The locale layout owns <html>/<body>. This root layout is a pass-through
// required by the Next.js App Router.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
