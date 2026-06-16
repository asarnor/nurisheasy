import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
});

export const metadata: Metadata = {
  title: 'SafePlate - B2B Food Marketplace',
  description: 'Multi-vendor food ordering platform with dietary compliance',
};

const isDebugMode =
  process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' ||
  process.env.DEBUG_MODE === 'true';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const body = (
    <html lang="en">
      <body className={`${manrope.variable} ${fraunces.variable} font-sans`}>{children}</body>
    </html>
  );

  if (isDebugMode && process.env.NODE_ENV !== 'production') {
    return body;
  }

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      {body}
    </ClerkProvider>
  );
}
