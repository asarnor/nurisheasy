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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <html lang="en">
        <body className={`${manrope.variable} ${fraunces.variable} font-sans`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
