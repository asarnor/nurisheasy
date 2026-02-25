import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentOrganization, getOrganizationFromMemberships } from '@/lib/utils/clerk';
import { getTestUserRole } from '@/lib/utils/debug';

export default async function Home() {
  const { userId, orgRole } = await auth();

  // If not authenticated, show landing page (no redirect)
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              SafePlate
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Multi-Vendor B2B Food Marketplace
            </p>
            <p className="text-gray-500">
              Order food safely with dietary compliance
            </p>
          </div>

          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Consumer/Client Card */}
            <a
              href="/sign-in?role=consumer"
              className="group bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-500"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                  <span className="text-3xl">🏠</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Group Home
                </h2>
                <p className="text-gray-600 mb-4">
                  Order food for your facility with safety-first dietary compliance
                </p>
                <div className="text-green-600 font-semibold">
                  Sign In as Client →
                </div>
              </div>
            </a>

            {/* Vendor Card */}
            <a
              href="/sign-in?role=vendor"
              className="group bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-500"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <span className="text-3xl">🍽️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Vendor
                </h2>
                <p className="text-gray-600 mb-4">
                  Manage your menu, accept orders, and grow your business
                </p>
                <div className="text-green-600 font-semibold">
                  Sign In as Vendor →
                </div>
              </div>
            </a>

            {/* Admin Card */}
            <a
              href="/sign-in?role=admin"
              className="group bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-500"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                  <span className="text-3xl">⚙️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Admin
                </h2>
                <p className="text-gray-600 mb-4">
                  Manage users, resolve disputes, and oversee platform operations
                </p>
                <div className="text-green-600 font-semibold">
                  Sign In as Admin →
                </div>
              </div>
            </a>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <a href="/sign-up?role=consumer" className="text-green-600 hover:text-green-700 font-semibold">
                Sign up as Group Home
              </a>
              {' or '}
              <a href="/sign-up?role=vendor" className="text-green-600 hover:text-green-700 font-semibold">
                Sign up as Vendor
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, redirect based on role
  try {
    const debugRole = await getTestUserRole();

    if (debugRole === 'admin') {
      redirect('/admin/dashboard');
    }
    if (debugRole === 'vendor') {
      redirect('/vendor/kds');
    }
    if (debugRole === 'consumer') {
      redirect('/marketplace');
    }

    let organization = await getCurrentOrganization();
    
    // Check if user is admin (based on Clerk role)
    if (orgRole === 'org:admin') {
      redirect('/admin/dashboard');
    }

    if (!organization) {
      const fallback = await getOrganizationFromMemberships();
      if (fallback.orgRole === 'org:admin') {
        redirect('/admin/dashboard');
      }
      organization = fallback.organization || organization;
    }
    
    // Check organization type
    if (organization) {
      if (organization.type === 'admin') {
        redirect('/admin/dashboard');
      } else if (organization.type === 'vendor') {
        redirect('/vendor/kds');
      } else if (organization.type === 'consumer') {
        redirect('/marketplace');
      }
    }
    
    // Default fallback
    redirect('/marketplace');
  } catch (error) {
    // If error getting organization, redirect to marketplace
    redirect('/marketplace');
  }
}
