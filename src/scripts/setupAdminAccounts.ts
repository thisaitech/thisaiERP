/**
 * Script to create admin accounts for Sandra Software and Thisai Technology
 *
 * To run this script:
 * 1. Make sure Firebase is configured with your credentials in .env file
 * 2. Uncomment the script execution at the bottom
 * 3. Run: npx ts-node src/scripts/setupAdminAccounts.ts
 * 4. Or create a temporary page in the app that calls these functions
 */

import { createAdminAccount } from '../services/authService'

// Admin account configurations
const ADMIN_ACCOUNTS = [
  {
    email: 'admin@sandrasoftware.com',
    password: 'Sandra@2024!', // Change this to a secure password
    companyName: 'Sandra Software',
    displayName: 'Sandra Admin'
  },
  {
    email: 'admin@thisaitech.com',
    password: 'ThisAI@2024!', // Change this to a secure password
    companyName: 'Thisai Technology',
    displayName: 'ThisAI Admin'
  }
]

/**
 * Create all admin accounts
 */
export const setupAllAdminAccounts = async () => {
  console.log('🚀 Starting admin account setup...\n')

  for (const account of ADMIN_ACCOUNTS) {
    try {
      console.log(`Creating account for ${account.email}...`)

      const userData = await createAdminAccount(
        account.email,
        account.password,
        account.companyName,
        account.displayName
      )

      console.log(`✓ Successfully created account:`)
      console.log(`  Email: ${userData.email}`)
      console.log(`  Company: ${userData.companyName}`)
      console.log(`  Role: ${userData.role}\n`)
    } catch (error: any) {
      console.error(`✗ Failed to create account for ${account.email}:`, error.message)

      // If account already exists, that's okay
      if (error.message.includes('already exists')) {
        console.log(`  ℹ️  Account already exists, skipping...\n`)
      } else {
        console.error(`  Error details:`, error, '\n')
      }
    }
  }

  console.log('✨ Admin account setup complete!\n')
  console.log('You can now login with:')
  ADMIN_ACCOUNTS.forEach(account => {
    console.log(`  ${account.email} / ${account.password}`)
  })
}

/**
 * Create a single admin account
 */
export const createSingleAdmin = async (
  email: string,
  password: string,
  companyName: string,
  displayName: string
) => {
  try {
    console.log(`Creating admin account for ${email}...`)

    const userData = await createAdminAccount(
      email,
      password,
      companyName,
      displayName
    )

    console.log('✓ Admin account created successfully!')
    console.log('Account details:', {
      email: userData.email,
      company: userData.companyName,
      role: userData.role
    })

    return userData
  } catch (error: any) {
    console.error('Failed to create admin account:', error.message)
    throw error
  }
}

// Uncomment to run directly with ts-node
// setupAllAdminAccounts()
//   .then(() => {
//     console.log('Script completed successfully')
//     process.exit(0)
//   })
//   .catch((error) => {
//     console.error('Script failed:', error)
//     process.exit(1)
//   })
