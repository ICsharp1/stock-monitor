# Permission System - Quick Setup Guide

## Files Created

All permission system files have been successfully created:

### Core Files

1. **C:\Users\israe\Downloads\FrontendThingy\stock-monitor\types\permissions.ts**
   - TypeScript type definitions for roles and permissions
   - Exports: `UserRole`, `UserRoleData`, `StockPermission`, `PermissionCheck`, etc.

2. **C:\Users\israe\Downloads\FrontendThingy\stock-monitor\lib\permissions.ts**
   - Client-side permission utilities
   - Functions: `getUserRole()`, `getUserAllowedSymbols()`, `canViewSymbol()`

3. **C:\Users\israe\Downloads\FrontendThingy\stock-monitor\lib\permissions-server.ts**
   - Server-side permission enforcement
   - Functions: `assertCanView()`, `assertRole()`, `getServerUserRole()`

4. **C:\Users\israe\Downloads\FrontendThingy\stock-monitor\hooks\usePermissions.ts**
   - React hooks for permission checks
   - Hooks: `useUserRole()`, `useAllowedSymbols()`, `useCanView()`

### Guard Components

5. **C:\Users\israe\Downloads\FrontendThingy\stock-monitor\components\auth\ProtectedRoute.tsx**
   - Protects routes requiring authentication
   - Redirects to login if not authenticated

6. **C:\Users\israe\Downloads\FrontendThingy\stock-monitor\components\auth\RoleGuard.tsx**
   - Restricts content by role (admin, trader, viewer)
   - Shows "Access Denied" if insufficient permissions

7. **C:\Users\israe\Downloads\FrontendThingy\stock-monitor\components\auth\SymbolGuard.tsx**
   - Checks if user can view specific stock symbol
   - Hides content if no permission

8. **C:\Users\israe\Downloads\FrontendThingy\stock-monitor\components\auth\index.ts**
   - Centralized exports for easy imports

### Scripts

9. **C:\Users\israe\Downloads\FrontendThingy\stock-monitor\scripts\seed-users.ts**
   - Creates demo users with different roles
   - Run with: `npm run seed`

## Next Steps

### 1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local

Open your `.env.local` file and add the service role key:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find the service role key in your Supabase dashboard:
- Go to Project Settings > API
- Copy the "service_role" key (⚠️ Keep this secret!)

### 2. Run the Seed Script

Create demo users by running:

```bash
npm run seed
```

This will create 3 users:

| Email | Password | Role | Can View |
|-------|----------|------|----------|
| admin@example.com | admin123 | Admin | ALL symbols (7 total) |
| trader@example.com | trader123 | Trader | BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT |
| viewer@example.com | viewer123 | Viewer | BTCUSDT, ETHUSDT |

### 3. Test the Permission System

#### Test Login with Different Roles

1. **Login as Admin**
   - Email: admin@example.com
   - Password: admin123
   - Should see: ALL 7 stock symbols

2. **Login as Trader**
   - Email: trader@example.com
   - Password: trader123
   - Should see: 4 stock symbols (BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT)

3. **Login as Viewer**
   - Email: viewer@example.com
   - Password: viewer123
   - Should see: 2 stock symbols (BTCUSDT, ETHUSDT)

## Usage Examples

### Protect a Page

```typescript
// app/dashboard/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Your dashboard content here</div>
    </ProtectedRoute>
  )
}
```

### Show Content Only to Admins

```typescript
import { RoleGuard } from '@/components/auth/RoleGuard'

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>

      <RoleGuard allowedRoles={['admin']}>
        <div>Admin-only content</div>
      </RoleGuard>

      <RoleGuard allowedRoles={['admin', 'trader']}>
        <div>Content for admins and traders</div>
      </RoleGuard>
    </div>
  )
}
```

### Check Symbol Permissions

```typescript
import { SymbolGuard } from '@/components/auth/SymbolGuard'

export default function StockList() {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']

  return (
    <div>
      {symbols.map(symbol => (
        <SymbolGuard key={symbol} symbol={symbol}>
          <StockCard symbol={symbol} />
        </SymbolGuard>
      ))}
    </div>
  )
}
```

### Use Hooks for Conditional Logic

```typescript
'use client'
import { useUserRole, useAllowedSymbols } from '@/hooks/usePermissions'

export default function MyComponent() {
  const { role, loading: roleLoading } = useUserRole()
  const { symbols, loading: symbolsLoading } = useAllowedSymbols()

  if (roleLoading || symbolsLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <p>Your role: {role}</p>
      <p>You can view {symbols.length} symbols:</p>
      <ul>
        {symbols.map(symbol => (
          <li key={symbol}>{symbol}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Server-Side Permission Check (API Route)

```typescript
// app/api/stock/[symbol]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertCanView } from '@/lib/permissions-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // This will throw an error if user doesn't have permission
    await assertCanView(user.id, params.symbol)

    // User has permission - proceed with the request
    const stockData = await fetchStockData(params.symbol)
    return NextResponse.json(stockData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to view this symbol' },
      { status: 403 }
    )
  }
}
```

## Stock Symbols Available

The system is configured for these 7 crypto symbols:

1. BTCUSDT (Bitcoin)
2. ETHUSDT (Ethereum)
3. BNBUSDT (Binance Coin)
4. SOLUSDT (Solana)
5. ADAUSDT (Cardano)
6. DOGEUSDT (Dogecoin)
7. XRPUSDT (Ripple)

## Troubleshooting

### Seed Script Errors

**Error: "Missing required environment variables"**
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`
- Restart your terminal after adding the key

**Error: "User already exists"**
- The demo users have already been created
- Delete them from Supabase Dashboard > Authentication > Users to re-seed

### Permission Denied Issues

**User can't see any symbols**
1. Check `user_roles` table - user should have a role entry
2. For non-admins, check `stock_permissions` table has entries
3. Verify the `can_view_stock` database function exists

**Admin can't see all symbols**
- Check that `getUserAllowedSymbols()` returns all 7 symbols for admin role
- Verify role is set to 'admin' in `user_roles` table

### TypeScript Errors

If you see import errors:
```bash
# Restart TypeScript server in VSCode
# Or run type check:
npm run type-check
```

## Security Notes

1. **Never expose SUPABASE_SERVICE_ROLE_KEY to the client**
   - Only use in server-side code (API routes, server components)
   - It bypasses Row Level Security (RLS)

2. **Always enforce permissions on the server**
   - Client-side guards are for UX only
   - Server-side checks (`assertCanView`) provide actual security

3. **Use the database function**
   - The `can_view_stock()` function ensures consistent permission logic
   - Called by both client and server utilities

## Additional Resources

For detailed documentation, see:
- **PERMISSIONS_README.md** - Complete documentation with examples
- **IMPLEMENTATION_PLAN.md** - Full project implementation guide

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the PERMISSIONS_README.md documentation
3. Verify database tables exist in Supabase
4. Check browser console for client-side errors
5. Check server logs for API errors
