# Permission System Documentation

## Overview

This application implements a complete ACL (Access Control List) permission system with both client-side and server-side enforcement. The system controls which stock symbols each user can view based on their role.

## User Roles

- **Admin**: Full access to all stock symbols
- **Trader**: Limited access to a subset of symbols (customizable)
- **Viewer**: Read-only access to a minimal set of symbols

## Quick Start

### 1. Set Up Environment Variables

Make sure you have the following in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for seeding
```

### 2. Seed Demo Users

Run the seed script to create demo users with different roles:

```bash
npm run seed
```

This creates 3 demo users:

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@example.com | admin123 | Admin | ALL symbols |
| trader@example.com | trader123 | Trader | BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT |
| viewer@example.com | viewer123 | Viewer | BTCUSDT, ETHUSDT |

### 3. Test the System

Login with each user to test different permission levels:

1. **Admin** - Can view all 7 stock symbols
2. **Trader** - Can view 4 symbols only
3. **Viewer** - Can view 2 symbols only

## Architecture

### Client-Side Components

#### Permission Utilities (`lib/permissions.ts`)

Client-side functions for permission checks:

```typescript
import { getUserRole, getUserAllowedSymbols, canViewSymbol } from '@/lib/permissions'

// Get user's role
const role = await getUserRole(userId)  // Returns: 'admin' | 'trader' | 'viewer' | null

// Get all symbols user can view
const symbols = await getUserAllowedSymbols(userId)  // Returns: string[]

// Check if user can view specific symbol
const canView = await canViewSymbol(userId, 'BTCUSDT')  // Returns: boolean
```

#### Permission Hooks (`hooks/usePermissions.ts`)

React hooks for permission checks in components:

```typescript
import { useUserRole, useAllowedSymbols, useCanView } from '@/hooks/usePermissions'

function MyComponent() {
  // Get current user's role
  const { role, loading } = useUserRole()

  // Get all allowed symbols
  const { symbols, loading } = useAllowedSymbols()

  // Check if user can view specific symbol
  const { canView, loading } = useCanView('BTCUSDT')
}
```

### Server-Side Components

#### Server Permission Enforcement (`lib/permissions-server.ts`)

Server-side functions for API routes and server components:

```typescript
import { assertCanView, assertRole, getServerUserRole } from '@/lib/permissions-server'

// In API route or server component
export async function GET(request: Request) {
  const { user } = await getUser()

  // Assert user can view symbol (throws error if not)
  await assertCanView(user.id, 'BTCUSDT')

  // Assert user has specific role (throws error if not)
  await assertRole(user.id, 'admin')

  // Get user's role
  const role = await getServerUserRole(user.id)
}
```

### Guard Components

#### ProtectedRoute

Protects entire routes/pages that require authentication:

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Protected content - only for authenticated users</div>
    </ProtectedRoute>
  )
}
```

#### RoleGuard

Restricts content based on user role:

```typescript
import { RoleGuard } from '@/components/auth/RoleGuard'

export default function AdminPanel() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div>Admin-only content</div>
    </RoleGuard>
  )
}

// Multiple roles
<RoleGuard allowedRoles={['admin', 'trader']}>
  <div>Content for admins and traders</div>
</RoleGuard>
```

#### SymbolGuard

Checks if user can view specific stock symbol:

```typescript
import { SymbolGuard } from '@/components/auth/SymbolGuard'

export default function StockCard({ symbol }: { symbol: string }) {
  return (
    <SymbolGuard symbol={symbol}>
      <div>Stock data for {symbol}</div>
    </SymbolGuard>
  )
}
```

## Usage Examples

### Example 1: Dashboard with Stock Cards

```typescript
'use client'

import { useAllowedSymbols } from '@/hooks/usePermissions'
import { SymbolGuard } from '@/components/auth/SymbolGuard'

export default function Dashboard() {
  const { symbols, loading } = useAllowedSymbols()

  if (loading) return <div>Loading...</div>

  return (
    <div className="grid grid-cols-3 gap-4">
      {symbols.map(symbol => (
        <SymbolGuard key={symbol} symbol={symbol}>
          <StockCard symbol={symbol} />
        </SymbolGuard>
      ))}
    </div>
  )
}
```

### Example 2: Admin Settings Page

```typescript
'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Settings</h1>

        <RoleGuard allowedRoles={['admin']}>
          <div className="mt-4">
            <h2>Admin Settings</h2>
            <p>Manage users, permissions, and system settings</p>
          </div>
        </RoleGuard>
      </div>
    </ProtectedRoute>
  )
}
```

### Example 3: API Route with Permission Check

```typescript
// app/api/stock/[symbol]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertCanView } from '@/lib/permissions-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can view this symbol
    await assertCanView(user.id, params.symbol)

    // User has permission - fetch and return data
    const stockData = await fetchStockData(params.symbol)
    return NextResponse.json(stockData)

  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Example 4: Server Component with Role Check

```typescript
// app/admin/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getServerUserRole } from '@/lib/permissions-server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = await getServerUserRole(user.id)

  if (role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Admin content */}
    </div>
  )
}
```

## Database Schema

The permission system relies on two tables:

### user_roles

Stores each user's role:

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'trader', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
)
```

### stock_permissions

Stores which symbols each user can view:

```sql
CREATE TABLE stock_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, symbol)
)
```

### Database Function

The `can_view_stock` function checks permissions:

```sql
CREATE OR REPLACE FUNCTION can_view_stock(check_user_id UUID, stock_symbol TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = check_user_id;

  -- Admins can view everything
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check explicit permissions
  RETURN EXISTS (
    SELECT 1
    FROM stock_permissions
    WHERE user_id = check_user_id
    AND symbol = stock_symbol
    AND can_view = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Managing Permissions

### Adding Permission for a User

```typescript
import { createClient } from '@/lib/supabase/client'

async function grantSymbolAccess(userId: string, symbol: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('stock_permissions')
    .insert({
      user_id: userId,
      symbol: symbol,
      can_view: true
    })

  if (error) {
    console.error('Error granting access:', error)
  }
}
```

### Revoking Permission

```typescript
async function revokeSymbolAccess(userId: string, symbol: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('stock_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('symbol', symbol)

  if (error) {
    console.error('Error revoking access:', error)
  }
}
```

### Changing User Role

```typescript
async function changeUserRole(userId: string, newRole: 'admin' | 'trader' | 'viewer') {
  const supabase = createClient()

  const { error } = await supabase
    .from('user_roles')
    .update({ role: newRole })
    .eq('user_id', userId)

  if (error) {
    console.error('Error changing role:', error)
  }
}
```

## Security Considerations

1. **Double Enforcement**: Permissions are checked on both client and server
   - Client: For UI/UX (hiding unauthorized content)
   - Server: For actual security (preventing unauthorized access)

2. **Database-Level Protection**: Use Supabase RLS (Row Level Security) policies

3. **Service Role Key**: Only use in server-side code, never expose to client

4. **Error Handling**: Permission errors should not leak sensitive information

5. **Caching**: The hooks cache permission data to minimize database queries

## Troubleshooting

### "Permission denied" errors

1. Check user has correct role in `user_roles` table
2. Verify `stock_permissions` entries exist for non-admin users
3. Ensure the `can_view_stock` database function is created

### Seed script fails

1. Verify `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`
2. Check database tables exist (`user_roles`, `stock_permissions`)
3. Ensure no existing users with same email

### Permissions not updating

1. Clear browser cache/local storage
2. Sign out and sign back in
3. Check database for correct permission entries

## File Structure

```
stock-monitor/
├── lib/
│   ├── permissions.ts          # Client-side permission utilities
│   └── permissions-server.ts   # Server-side permission enforcement
├── hooks/
│   └── usePermissions.ts       # React permission hooks
├── components/
│   └── auth/
│       ├── ProtectedRoute.tsx  # Auth guard component
│       ├── RoleGuard.tsx       # Role-based guard component
│       └── SymbolGuard.tsx     # Symbol permission guard
├── types/
│   └── permissions.ts          # TypeScript type definitions
└── scripts/
    └── seed-users.ts           # Demo user seed script
```

## Next Steps

1. Customize the available stock symbols list
2. Build an admin UI for managing user permissions
3. Add audit logging for permission changes
4. Implement role hierarchy (e.g., admin inherits trader permissions)
5. Add time-based permissions (e.g., temporary access)
