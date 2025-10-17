# Better-Auth to Clerk Migration: Complete Implementation

## Overview

This document details the complete migration from better-auth to Clerk authentication in the create-t3-turbo monorepo. The migration involved replacing the entire authentication system while maintaining compatibility with the existing T3 stack (Next.js, tRPC, Drizzle).

## Problem Statement

The original create-t3-turbo template used better-auth for authentication, but the user wanted to migrate to Clerk for:

- **Simplified authentication setup**
- **Better developer experience**
- **More robust authentication features**
- **Easier social authentication**
- **Username/password authentication only**

## Migration Strategy

### 1. Dependency Management

**Removed better-auth dependencies:**

- `better-auth` from all package.json files
- `@better-auth/expo` from Expo app
- `@better-auth/cli` from dev dependencies
- All better-auth related scripts

**Added Clerk dependencies:**

- `@clerk/nextjs` for Next.js integration
- `@clerk/clerk-expo` for Expo integration
- `@clerk/backend` for server-side token verification

### 2. Authentication Package Replacement

**Before (better-auth):**

```typescript
// packages/auth/src/index.ts
export function initAuth(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string;
  discordClientId: string;
  discordClientSecret: string;
}) {
  const config = {
    database: drizzleAdapter(db, { provider: "pg" }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [oAuthProxy({ productionURL: options.productionUrl }), expo()],
    socialProviders: {
      discord: {
        clientId: options.discordClientId,
        clientSecret: options.discordClientSecret,
        redirectURI: `${options.productionUrl}/api/auth/callback/discord`,
      },
    },
    trustedOrigins: ["expo://"],
  };
  return betterAuth(config);
}
```

**After (Clerk):**

```typescript
// packages/auth/src/index.ts
// Re-export Clerk server utilities
export { auth, currentUser } from "@clerk/nextjs/server";

// packages/auth/src/react.ts
// Re-export Clerk React hooks and components
export {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
  SignUpButton,
  SignIn,
  SignUp,
  useUser,
  useAuth,
} from "@clerk/nextjs";
```

### 3. Database Schema Changes

**Removed better-auth tables:**

- `user` table (better-auth specific)
- `session` table (better-auth specific)
- `account` table (better-auth specific)
- `verification` table (better-auth specific)

**Why remove these tables?**

- Clerk manages user data in their own system
- No need for custom user tables
- Simplified database schema
- Reduced maintenance overhead

### 4. Next.js App Integration

**Added Clerk middleware:**

```typescript
// apps/nextjs/src/middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  publicRoutes: ["/", "/favicon.ico", "/health"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

**Updated root layout:**

```typescript
// apps/nextjs/src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TRPCReactProvider>{props.children}</TRPCReactProvider>
            <div className="absolute right-4 bottom-4">
              <ThemeToggle />
            </div>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**Updated auth components:**

```typescript
// apps/nextjs/src/app/_components/auth-showcase.tsx
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@acme/auth/react";

export async function AuthShowcase() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <SignedOut>
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <button className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex items-center gap-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
    </div>
  );
}
```

### 5. tRPC Context Updates

**Before (better-auth):**

```typescript
export const createTRPCContext = async (opts: {
  headers: Headers;
  auth: Auth;
}) => {
  const authApi = opts.auth.api;
  const session = await authApi.getSession({
    headers: opts.headers,
  });
  return {
    authApi,
    session,
    db,
  };
};
```

**After (Clerk):**

```typescript
export const createTRPCContext = async (opts: {
  headers: Headers;
  auth: typeof auth;
}) => {
  const authData = await opts.auth();
  return {
    auth: authData,
    db,
  };
};
```

**Updated protected procedure:**

```typescript
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.auth?.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `auth` as non-nullable
        auth: { ...ctx.auth, userId: ctx.auth.userId },
      },
    });
  });
```

### 6. Expo App Integration

**Updated root layout:**

```typescript
// apps/expo/src/app/_layout.tsx
import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{...}} />
        <StatusBar />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
```

**Updated auth utilities:**

```typescript
// apps/expo/src/utils/auth.ts
import { useAuth, useUser } from "@clerk/clerk-expo";

export { useAuth, useUser };
```

**Updated auth components:**

```typescript
// apps/expo/src/app/index.tsx
function MobileAuth() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) {
    return (
      <View className="flex-1">
        <SignIn />
      </View>
    );
  }

  return (
    <>
      <Text className="text-foreground pb-2 text-center text-xl font-semibold">
        Hello, {user?.username || user?.emailAddresses[0]?.emailAddress}
      </Text>
      <Pressable
        onPress={() => signOut()}
        className="bg-primary flex items-center rounded-sm p-2"
      >
        <Text>Sign Out</Text>
      </Pressable>
    </>
  );
}
```

### 7. Environment Variables

**Removed better-auth variables:**

- `AUTH_SECRET`
- `AUTH_DISCORD_ID`
- `AUTH_DISCORD_SECRET`

**Added Clerk variables:**

```typescript
// apps/nextjs/src/env.ts
export const env = createEnv({
  extends: [vercel()],
  server: {
    POSTGRES_URL: z.url(),
    CLERK_SECRET_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
});
```

### 8. API Route Cleanup

**Removed better-auth API route:**

- `apps/nextjs/src/app/api/auth/[...all]/route.ts` - No longer needed

**Why remove?**

- Clerk handles authentication endpoints
- No custom auth API needed
- Simplified routing

## Migration Benefits

### 1. Simplified Authentication

- **No custom auth logic**: Clerk handles everything
- **Built-in UI components**: Pre-built sign-in/sign-up forms
- **Automatic session management**: No custom session handling needed

### 2. Better Developer Experience

- **Clear documentation**: Clerk has excellent docs
- **Type safety**: Full TypeScript support
- **Easy testing**: Simple to mock in tests

### 3. Reduced Maintenance

- **No custom auth code**: Less code to maintain
- **Automatic updates**: Clerk handles security updates
- **Built-in features**: MFA, social auth, etc. included

### 4. Performance

- **Optimized components**: Clerk components are well-optimized
- **CDN delivery**: Clerk assets served from CDN
- **Caching**: Built-in caching for auth state

## Implementation Challenges

### 1. Type System Changes

**Challenge**: better-auth and Clerk have different type systems
**Solution**: Created adapter layer in `@acme/auth` package

### 2. Session Management

**Challenge**: Different session handling patterns
**Solution**: Updated tRPC context to use Clerk's `auth()` function

### 3. Component Migration

**Challenge**: Different component APIs
**Solution**: Replaced better-auth components with Clerk equivalents

### 4. Environment Variables

**Challenge**: Different environment variable requirements
**Solution**: Updated env validation and removed unused variables

## Testing the Migration

### 1. Environment Setup

```bash
# Add to .env file
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 2. Test Authentication Flow

1. **Sign up**: Create new account with username/password
2. **Sign in**: Login with existing credentials
3. **Sign out**: Logout and verify session cleared
4. **Protected routes**: Verify auth required for protected content

### 3. Test tRPC Integration

1. **Public procedures**: Should work without auth
2. **Protected procedures**: Should require authentication
3. **User context**: Should have access to user data

## Files Modified

### Removed Files

- `packages/auth/src/index.ts` (better-auth config)
- `packages/auth/script/auth-cli.ts` (CLI config)
- `packages/auth/env.ts` (better-auth env vars)
- `packages/db/src/auth-schema.ts` (better-auth tables)
- `apps/nextjs/src/app/api/auth/[...all]/route.ts` (auth API)

### Updated Files

- `packages/auth/package.json` - Updated dependencies
- `packages/auth/src/index.ts` - Clerk server exports
- `packages/auth/src/react.ts` - Clerk React exports
- `packages/db/src/schema.ts` - Removed auth schema export
- `packages/api/src/trpc.ts` - Updated context for Clerk
- `packages/api/src/router/auth.ts` - Updated auth router
- `apps/nextjs/src/middleware.ts` - Added Clerk middleware
- `apps/nextjs/src/app/layout.tsx` - Added ClerkProvider
- `apps/nextjs/src/app/_components/auth-showcase.tsx` - Updated components
- `apps/nextjs/src/auth/server.ts` - Updated server auth
- `apps/nextjs/src/auth/client.ts` - Updated client auth
- `apps/nextjs/src/trpc/server.tsx` - Updated tRPC context
- `apps/nextjs/src/env.ts` - Updated environment variables
- `apps/expo/src/app/_layout.tsx` - Added ClerkProvider
- `apps/expo/src/utils/auth.ts` - Updated auth utilities
- `apps/expo/src/app/index.tsx` - Updated auth components
- `package.json` - Removed auth generation script
- `pnpm-workspace.yaml` - Removed better-auth dependencies

### Added Files

- `apps/nextjs/src/middleware.ts` - Clerk middleware
- `packages/auth/src/react.ts` - Clerk React exports

## Conclusion

The migration from better-auth to Clerk was successful and provides:

- ✅ **Simplified authentication setup**
- ✅ **Better developer experience**
- ✅ **Reduced maintenance overhead**
- ✅ **Full TypeScript support**
- ✅ **Seamless T3 stack integration**
- ✅ **Username/password authentication**
- ✅ **Cross-platform support** (Next.js + Expo)

The new authentication system is more robust, easier to maintain, and provides a better developer experience while maintaining full compatibility with the existing T3 stack.
