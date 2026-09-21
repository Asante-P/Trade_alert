import { z } from 'zod';

/**
 * Environment variable validation schema
 */
const envSchema = z.object({
  // Backend Configuration
  NEXT_PUBLIC_BACKEND_URL: z.string().url().default('http://localhost:3000'),
  BACKEND_URL: z.string().url().default('http://localhost:3000'),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().or(z.literal('')).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  
  // Application Configuration
  NEXT_PUBLIC_APP_NAME: z.string().default('Trade Alert Dashboard'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  
  // API Configuration
  NEXT_PUBLIC_API_TIMEOUT: z.string().transform(Number).default('30000'),
  NEXT_PUBLIC_REFRESH_INTERVAL: z.string().transform(Number).default('15000'),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_MARKET_DATA: z.string().transform(val => val === 'true').default('true'),
  NEXT_PUBLIC_ENABLE_MTF_ANALYSIS: z.string().transform(val => val === 'true').default('true'),
  NEXT_PUBLIC_ENABLE_AI_ANALYZER: z.string().transform(val => val === 'true').default('true'),
});

/**
 * Validate and parse environment variables
 */
export function validateEnv() {
  try {
    const env = envSchema.parse({
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      BACKEND_URL: process.env.BACKEND_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
      NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT,
      NEXT_PUBLIC_REFRESH_INTERVAL: process.env.NEXT_PUBLIC_REFRESH_INTERVAL,
      NEXT_PUBLIC_ENABLE_MARKET_DATA: process.env.NEXT_PUBLIC_ENABLE_MARKET_DATA,
      NEXT_PUBLIC_ENABLE_MTF_ANALYSIS: process.env.NEXT_PUBLIC_ENABLE_MTF_ANALYSIS,
      NEXT_PUBLIC_ENABLE_AI_ANALYZER: process.env.NEXT_PUBLIC_ENABLE_AI_ANALYZER,
    });
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

/**
 * Type-safe environment variables
 */
export const env = validateEnv();
