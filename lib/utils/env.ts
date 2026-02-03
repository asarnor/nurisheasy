/**
 * Environment Variable Validation and Access
 * 
 * This utility provides type-safe access to environment variables
 * and validates required variables at startup.
 */

// Required environment variables
const requiredEnvVars = {
  // Database
  MONGO_URI: process.env.MONGO_URI,
  
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  
  // Stripe Payments
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  
  // Redis
  REDIS_URL: process.env.REDIS_URL,
} as const;

// Optional environment variables with defaults
const optionalEnvVars = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Clerk URLs
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/',
  
  // Webhooks
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Optional Services
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'SafePlate <orders@safeplate.com>',
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  CRON_API_KEY: process.env.CRON_API_KEY,
} as const;

/**
 * Validate required environment variables
 * Call this at application startup
 */
export function validateEnvVars(): void {
  const missing: string[] = [];
  
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
      missing.push(key);
    }
  });
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file or environment configuration.`
    );
  }
}

/**
 * Get environment variable with type safety
 */
export const env = {
  // Required
  MONGO_URI: requiredEnvVars.MONGO_URI!,
  CLERK_PUBLISHABLE_KEY: requiredEnvVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  CLERK_SECRET_KEY: requiredEnvVars.CLERK_SECRET_KEY!,
  STRIPE_SECRET_KEY: requiredEnvVars.STRIPE_SECRET_KEY!,
  STRIPE_PUBLISHABLE_KEY: requiredEnvVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  REDIS_URL: requiredEnvVars.REDIS_URL!,
  
  // Optional with defaults
  NODE_ENV: optionalEnvVars.NODE_ENV,
  APP_URL: optionalEnvVars.NEXT_PUBLIC_APP_URL,
  CLERK_SIGN_IN_URL: optionalEnvVars.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  CLERK_SIGN_UP_URL: optionalEnvVars.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  CLERK_AFTER_SIGN_IN_URL: optionalEnvVars.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
  CLERK_AFTER_SIGN_UP_URL: optionalEnvVars.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  CLERK_WEBHOOK_SECRET: optionalEnvVars.CLERK_WEBHOOK_SECRET,
  STRIPE_WEBHOOK_SECRET: optionalEnvVars.STRIPE_WEBHOOK_SECRET,
  TWILIO_ACCOUNT_SID: optionalEnvVars.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: optionalEnvVars.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: optionalEnvVars.TWILIO_PHONE_NUMBER,
  RESEND_API_KEY: optionalEnvVars.RESEND_API_KEY,
  RESEND_FROM_EMAIL: optionalEnvVars.RESEND_FROM_EMAIL,
  GOOGLE_MAPS_API_KEY: optionalEnvVars.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  CRON_API_KEY: optionalEnvVars.CRON_API_KEY,
  
  // Helpers
  isDevelopment: optionalEnvVars.NODE_ENV === 'development',
  isProduction: optionalEnvVars.NODE_ENV === 'production',
  isStaging: optionalEnvVars.NODE_ENV === 'production' && optionalEnvVars.NEXT_PUBLIC_APP_URL.includes('staging'),
} as const;

/**
 * Check if optional service is configured
 */
export const isServiceConfigured = {
  twilio: !!(optionalEnvVars.TWILIO_ACCOUNT_SID && optionalEnvVars.TWILIO_AUTH_TOKEN && optionalEnvVars.TWILIO_PHONE_NUMBER),
  resend: !!optionalEnvVars.RESEND_API_KEY,
  googleMaps: !!optionalEnvVars.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  cronAuth: !!optionalEnvVars.CRON_API_KEY,
} as const;
