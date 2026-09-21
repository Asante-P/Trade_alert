# Trade Alert Web Dashboard - Development Guide

This file contains project-specific development information and workflows for the Trade Alert Web Dashboard.

## Project Overview

This is a Next.js 16 web dashboard for monitoring TradingView indicator alerts with real-time updates, multi-timeframe trend analysis, and comprehensive type safety.

## Development Setup

### Initial Setup
```bash
cd web-dashboard
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### Root-Level Development
From the project root, you can manage all services:
```bash
npm run install:all      # Install all dependencies
npm run dev              # Start all services (backend, web, flutter)
npm run dev:web          # Start web dashboard only
npm run build:web        # Build web dashboard for production
```

## Key Architectural Patterns

### Custom Hooks Pattern
All data fetching is handled through custom hooks in `src/hooks/`:
- `useMarketData` - Fetches market data with loading/error states
- `useTrendAnalysis` - Calculates trend bias from market data
- `useAlerts` - Fetches alert history with auto-refresh

### API Client Pattern
All backend communication goes through the centralized API client in `src/lib/api.ts`:
- Type-safe request/response handling
- Automatic timeout management
- Custom error handling with `ApiError` class
- Environment-based configuration

### Configuration Pattern
All configuration is centralized in `src/lib/config.ts`:
- Environment-based settings
- Feature flags
- Component-specific configurations
- Type-safe access

### Type Safety Pattern
- TypeScript strict mode enabled
- Comprehensive type definitions in `src/types/index.ts`
- No `any` types - use proper interfaces
- Environment validation with Zod in `src/lib/env-validation.ts`

## Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries
└── types/           # TypeScript definitions
```

## Important Files

### Configuration Files
- `src/lib/config.ts` - Centralized configuration
- `src/lib/env-validation.ts` - Environment variable validation
- `tsconfig.json` - TypeScript configuration (strict mode enabled)

### Core Libraries
- `src/lib/api.ts` - API client for backend communication
- `src/lib/utils.ts` - Shared utility functions
- `src/lib/supabase.ts` - Supabase client configuration

### Type Definitions
- `src/types/index.ts` - All TypeScript interfaces and types

## Component Guidelines

### When Creating New Components
1. Use TypeScript interfaces for all props
2. Implement loading and error states
3. Use custom hooks for data fetching
4. Follow the existing component structure
5. Add proper TypeScript types

### When Modifying Existing Components
1. Maintain the separation of concerns
2. Use the centralized API client
3. Leverage shared utilities from `lib/utils.ts`
4. Preserve the loading/error state pattern
5. Update types if data structures change

## Data Flow Patterns

### Market Data Flow
1. Component uses `useMarketData` hook
2. Hook calls `apiClient.getMarketData()`
3. API client handles request/response
4. Component receives data, loading, and error states

### Trend Analysis Flow
1. Component uses `useTrendAnalysis` hook
2. Hook receives market data from `useMarketData`
3. Hook calculates EMA and trend bias
4. Component receives calculated trends

### Alert Data Flow
1. Component uses `useAlerts` hook
2. Hook calls `apiClient.getAlerts()`
3. Auto-refreshes based on configured interval
4. Component receives alerts with loading/error states

## Environment Variables

### Required Variables
- `NEXT_PUBLIC_BACKEND_URL` - Backend server URL
- `BACKEND_URL` - Backend server URL (server-side)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

### Optional Variables
- `NEXT_PUBLIC_APP_NAME` - Application name
- `NEXT_PUBLIC_APP_VERSION` - Application version
- `NEXT_PUBLIC_API_TIMEOUT` - API request timeout (ms)
- `NEXT_PUBLIC_REFRESH_INTERVAL` - Data refresh interval (ms)
- `NEXT_PUBLIC_ENABLE_*` - Feature flags

## Common Tasks

### Adding a New API Endpoint
1. Add the method to `ApiClient` class in `src/lib/api.ts`
2. Update types in `src/types/index.ts` if needed
3. Create a custom hook if it's a data fetching operation
4. Add error handling and type safety

### Adding a New Component
1. Create component file in `src/components/`
2. Define TypeScript interfaces for props
3. Implement loading and error states
4. Use custom hooks for data fetching
5. Add proper TypeScript types throughout

### Modifying Configuration
1. Update `src/lib/config.ts` for application config
2. Update `src/lib/env-validation.ts` for environment validation
3. Update `.env.example` with new variables
4. Document changes in this file

## Troubleshooting

### TypeScript Errors
- Ensure all dependencies are installed
- Check that interfaces are properly defined
- Verify no `any` types are used
- Run `npm run build` to catch compilation errors

### API Errors
- Check backend server is running
- Verify `BACKEND_URL` in `.env.local`
- Check browser console for error details
- Review API client error handling

### Environment Issues
- Ensure `.env.local` exists and is configured
- Check that required variables are set
- Verify environment validation passes
- Restart development server after env changes

## Build and Deployment

### Local Build
```bash
npm run build
npm start
```

### Production Build
1. Set production environment variables
2. Run `npm run build`
3. Deploy the `.next` folder
4. Start with `npm start`

### Vercel Deployment
- Connect GitHub repository
- Configure environment variables in Vercel dashboard
- Deploy automatically on push

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types
- Proper interface definitions
- Type-safe environment access

### React
- Functional components with hooks
- Custom hooks for reusable logic
- Proper error boundaries
- Loading states for async operations

### API
- Centralized API client
- Type-safe requests/responses
- Error handling with custom error class
- Timeout management

## Verification Commands

### Type Checking
```bash
npm run build  # This will catch TypeScript errors
```

### Linting
```bash
npm run lint
```

### Development Server
```bash
npm run dev
```

## Notes

- The project uses Next.js 16 with the App Router
- All components are client-side ('use client' directive)
- Market hours are checked for XAUUSD (Sunday 5pm EST to Friday 5pm EST)
- EMA calculations use multiple periods (9, 21, 50) for trend analysis
- Bias calculation uses configurable threshold (default 1.5x)
- All time intervals are configurable via config object
