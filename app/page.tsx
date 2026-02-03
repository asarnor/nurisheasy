import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Redirect based on organization type
  // This would be determined by checking the organization type from Clerk
  // For now, redirect to marketplace as default
  
  redirect('/marketplace');
}
