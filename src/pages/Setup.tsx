import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkle, CheckCircle, XCircle, Warning } from '@phosphor-icons/react'
import { setupAllAdminAccounts } from '../scripts/setupAdminAccounts'
import { isFirebaseConfigured } from '../services/firebase'
import { toast } from 'sonner'

const Setup = () => {
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [setupLogs, setSetupLogs] = useState<string[]>([])

  const handleSetup = async () => {
    if (!isFirebaseConfigured()) {
      toast.error('Firebase is not configured. Please add credentials to .env file.')
      return
    }

    setIsLoading(true)
    setSetupLogs([])

    try {
      // Capture console logs
      const logs: string[] = []
      const originalLog = console.log
      const originalError = console.error

      console.log = (...args) => {
        const message = args.join(' ')
        logs.push(message)
        setSetupLogs([...logs])
        originalLog(...args)
      }

      console.error = (...args) => {
        const message = '❌ ' + args.join(' ')
        logs.push(message)
        setSetupLogs([...logs])
        originalError(...args)
      }

      await setupAllAdminAccounts()

      // Restore console
      console.log = originalLog
      console.error = originalError

      setIsSetupComplete(true)
      toast.success('Admin accounts created successfully!')
    } catch (error: any) {
      toast.error('Setup failed: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-flex p-4 bg-gradient-to-br from-primary to-accent rounded-2xl mb-4"
          >
            <Sparkle size={32} weight="duotone" className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Admin Account Setup
          </h1>
          <p className="text-slate-600">Create admin accounts for Sandra Software and Thisai Technology</p>
        </div>

        {/* Firebase Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            {isFirebaseConfigured() ? (
              <CheckCircle size={24} className="text-success" weight="fill" />
            ) : (
              <Warning size={24} className="text-warning" weight="fill" />
            )}
            <h2 className="text-xl font-bold">Firebase Status</h2>
          </div>

          {isFirebaseConfigured() ? (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-success font-medium">✓ Firebase is configured and ready</p>
            </div>
          ) : (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <p className="text-warning font-medium mb-2">⚠ Firebase is not configured</p>
              <p className="text-sm text-slate-600 mb-3">
                Please add your Firebase credentials to the .env file:
              </p>
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-100">
                <div>VITE_FIREBASE_API_KEY=your_api_key</div>
                <div>VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com</div>
                <div>VITE_FIREBASE_PROJECT_ID=your-project-id</div>
                <div>VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com</div>
                <div>VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id</div>
                <div>VITE_FIREBASE_APP_ID=your_app_id</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Admin Accounts Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-6"
        >
          <h2 className="text-xl font-bold mb-4">Accounts to Create</h2>

          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-900">Sandra Software</p>
              <p className="text-sm text-blue-700">Email: admin@sandrasoftware.com</p>
              <p className="text-xs text-blue-600 mt-1">Default password will be set</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="font-semibold text-purple-900">Thisai Technology</p>
              <p className="text-sm text-purple-700">Email: admin@thisaitech.com</p>
              <p className="text-xs text-purple-600 mt-1">Default password will be set</p>
            </div>
          </div>
        </motion.div>

        {/* Setup Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSetup}
          disabled={isLoading || isSetupComplete || !isFirebaseConfigured()}
          className="w-full bg-gradient-to-r from-primary to-accent text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkle size={24} />
              </motion.div>
              Creating Accounts...
            </>
          ) : isSetupComplete ? (
            <>
              <CheckCircle size={24} weight="fill" />
              Setup Complete!
            </>
          ) : (
            <>
              <Sparkle size={24} />
              Create Admin Accounts
            </>
          )}
        </motion.button>

        {/* Setup Logs */}
        {setupLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Setup Log</h3>
            <div className="bg-slate-950 rounded-lg p-4 max-h-96 overflow-y-auto">
              {setupLogs.map((log, index) => (
                <div key={index} className="text-xs text-slate-300 font-mono py-1">
                  {log}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Success Message */}
        {isSetupComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-success/10 border border-success/20 rounded-2xl p-6 text-center"
          >
            <CheckCircle size={48} className="text-success mx-auto mb-3" weight="fill" />
            <h3 className="text-xl font-bold text-success mb-2">Setup Complete!</h3>
            <p className="text-slate-600 mb-4">
              Admin accounts have been created successfully. You can now login with the credentials shown above.
            </p>
            <a
              href="/login"
              className="inline-block bg-success text-white px-6 py-3 rounded-lg font-semibold hover:bg-success/90 transition-colors"
            >
              Go to Login
            </a>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Setup
