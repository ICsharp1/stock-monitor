/**
 * Seed script to create demo users with different roles and permissions
 *
 * Usage:
 * 1. Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local
 * 2. Run: npm run seed
 *
 * Creates 3 demo users:
 * - Admin: admin@example.com / admin123 (access to ALL symbols)
 * - Trader: trader@example.com / trader123 (access to 4 symbols)
 * - Viewer: viewer@example.com / viewer123 (access to 2 symbols)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface DemoUser {
  email: string
  password: string
  role: 'admin' | 'trader' | 'viewer'
  symbols: string[]
}

const demoUsers: DemoUser[] = [
  {
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    symbols: [] // Admins have access to all symbols by default
  },
  {
    email: 'trader@example.com',
    password: 'trader123',
    role: 'trader',
    symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']
  },
  {
    email: 'viewer@example.com',
    password: 'viewer123',
    role: 'viewer',
    symbols: ['BTCUSDT', 'ETHUSDT']
  }
]

async function seedUsers() {
  console.log('🌱 Starting user seed process...\n')
  console.log('📍 Supabase URL:', supabaseUrl)
  console.log('🔑 Using service role key\n')

  for (const user of demoUsers) {
    try {
      console.log(`\n👤 Creating user: ${user.email}`)

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers()
      const userExists = existingUser?.users.some(u => u.email === user.email)

      if (userExists) {
        console.log(`⚠️  User ${user.email} already exists, skipping...`)
        continue
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role
        }
      })

      if (authError) {
        console.error(`❌ Error creating auth user ${user.email}:`, authError.message)
        continue
      }

      if (!authData.user) {
        console.error(`❌ No user data returned for ${user.email}`)
        continue
      }

      const userId = authData.user.id
      console.log(`✅ Auth user created with ID: ${userId}`)

      // Insert role into user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: user.role
        })

      if (roleError) {
        console.error(`❌ Error setting role for ${user.email}:`, roleError.message)
        // Try to clean up the auth user
        await supabase.auth.admin.deleteUser(userId)
        continue
      }

      console.log(`✅ Role set to: ${user.role}`)

      // Insert stock permissions (skip for admin - they have access to everything)
      if (user.role !== 'admin' && user.symbols.length > 0) {
        const permissions = user.symbols.map(symbol => ({
          user_id: userId,
          symbol,
          can_view: true
        }))

        const { error: permError } = await supabase
          .from('stock_permissions')
          .insert(permissions)

        if (permError) {
          console.error(`❌ Error setting permissions for ${user.email}:`, permError.message)
          // Continue anyway - user is created, just missing permissions
        } else {
          console.log(`✅ Permissions set for symbols: ${user.symbols.join(', ')}`)
        }
      } else if (user.role === 'admin') {
        console.log(`✅ Admin role - has access to ALL symbols`)
      }

      console.log(`\n✅ Successfully created ${user.role}: ${user.email}`)
      console.log(`   Password: ${user.password}`)
      if (user.symbols.length > 0) {
        console.log(`   Can view: ${user.symbols.join(', ')}`)
      } else {
        console.log(`   Can view: ALL symbols (admin)`)
      }
    } catch (error) {
      console.error(`❌ Unexpected error creating ${user.email}:`, error)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Seed process complete!')
  console.log('='.repeat(60))
  console.log('\n📋 Demo Credentials Summary:')
  console.log('\n1. Admin (Full Access):')
  console.log('   Email: admin@example.com')
  console.log('   Password: admin123')
  console.log('   Access: ALL symbols')
  console.log('\n2. Trader (Limited Access):')
  console.log('   Email: trader@example.com')
  console.log('   Password: trader123')
  console.log('   Access: BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT')
  console.log('\n3. Viewer (Read-Only):')
  console.log('   Email: viewer@example.com')
  console.log('   Password: viewer123')
  console.log('   Access: BTCUSDT, ETHUSDT')
  console.log('\n' + '='.repeat(60))
}

// Run the seed function
seedUsers()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
