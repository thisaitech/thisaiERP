import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkle,
  Envelope,
  Lock,
  ArrowRight,
  Eye,
  EyeSlash,
  User,
  Buildings,
  MapPin,
  Phone,
  CheckCircle,
  Warning,
  CaretLeft,
  ShieldCheck,
  Lightning
} from '@phosphor-icons/react'
import { signIn, createAdminAccount } from '../services/authService'
import { toast } from 'sonner'

type AuthMode = 'login' | 'register' | 'forgot'

// Input field component - MUST be outside Login component to prevent focus loss
const InputField = ({
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  error,
  showToggle,
  onToggle,
  toggleState,
  disabled
}: {
  icon: any
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  error?: string
  showToggle?: boolean
  onToggle?: () => void
  toggleState?: boolean
  disabled?: boolean
}) => (
  <div>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon size={20} className={error ? 'text-red-400' : 'text-slate-400'} />
      </div>
      <input
        type={showToggle ? (toggleState ? 'text' : 'password') : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-10 ${showToggle ? 'pr-12' : 'pr-4'} py-3 border ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-primary'
        } rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all bg-white/80 backdrop-blur-sm text-slate-900 placeholder:text-slate-400`}
        placeholder={placeholder}
        disabled={disabled}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
        >
          {toggleState ? <EyeSlash size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-red-500 text-xs mt-1 flex items-center gap-1"
      >
        <Warning size={12} weight="fill" />
        {error}
      </motion.p>
    )}
  </div>
)

const Login = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate phone format (Indian)
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true
    const phoneRegex = /^[6-9]\d{9}$/
    return phoneRegex.test(phone.replace(/\D/g, ''))
  }

  // Clear errors when switching modes
  useEffect(() => {
    setErrors({})
  }, [mode])

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        newErrors.fullName = 'Full name is required'
      }

      if (!companyName.trim()) {
        newErrors.companyName = 'Company/Business name is required'
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }

      if (phone && !validatePhone(phone)) {
        newErrors.phone = 'Invalid phone number'
      }

      if (!agreedToTerms) {
        newErrors.terms = 'You must agree to the terms and conditions'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const userData = await signIn(email, password)
      toast.success(`Welcome back, ${userData.displayName || userData.email}!`)

      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(userData))

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      // Navigate to dashboard
      navigate('/')
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const userData = await createAdminAccount(email, password, fullName, companyName)
      toast.success(`Welcome to ThisAI ERP, ${fullName}! Your account is ready.`)

      // Store user data
      localStorage.setItem('user', JSON.stringify(userData))

      // Navigate directly to dashboard - new company is ready to use
      navigate('/')
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setErrors({ email: 'Email is required' })
      return
    }

    if (!validateEmail(email)) {
      setErrors({ email: 'Invalid email format' })
      return
    }

    toast.info('Password reset feature coming soon. Please contact support.')
  }

  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail')
    if (remembered) {
      setEmail(remembered)
      setRememberMe(true)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="inline-flex p-4 bg-white rounded-2xl shadow-lg mb-4"
          >
            <Sparkle size={32} weight="duotone" className="text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            ThisAI ERP
          </h1>
          <p className="text-slate-600">
            {mode === 'login' && 'ThisAI ERP - Sign in to continue'}
            {mode === 'register' && 'Create your business account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {/* Auth Card */}
        <motion.div
          layout
          className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 overflow-hidden text-slate-900"
        >
          <AnimatePresence mode="wait">
            {/* Login Form */}
            {mode === 'login' && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <InputField
                  icon={Envelope}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="Email address"
                  error={errors.email}
                  disabled={isLoading}
                />

                <InputField
                  icon={Lock}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Password"
                  error={errors.password}
                  showToggle
                  onToggle={() => setShowPassword(!showPassword)}
                  toggleState={showPassword}
                  disabled={isLoading}
                />

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-slate-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary to-accent text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkle size={20} />
                      </motion.div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={20} weight="bold" />
                    </>
                  )}
                </motion.button>

                {/* Register Link */}
                <p className="text-center text-sm text-slate-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-primary font-semibold hover:underline"
                  >
                    Register now
                  </button>
                </p>
              </motion.form>
            )}

            {/* Registration Form */}
            {mode === 'register' && (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="flex items-center gap-1 text-sm text-slate-600 hover:text-primary mb-2"
                >
                  <CaretLeft size={16} />
                  Back to login
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    icon={User}
                    type="text"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Full Name *"
                    error={errors.fullName}
                    disabled={isLoading}
                  />
                  <InputField
                    icon={Phone}
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    placeholder="Phone (Optional)"
                    error={errors.phone}
                    disabled={isLoading}
                  />
                </div>

                <InputField
                  icon={Buildings}
                  type="text"
                  value={companyName}
                  onChange={setCompanyName}
                  placeholder="Company/Business Name *"
                  error={errors.companyName}
                  disabled={isLoading}
                />

                <InputField
                  icon={MapPin}
                  type="text"
                  value={location}
                  onChange={setLocation}
                  placeholder="City/Location (Optional)"
                  error={errors.location}
                  disabled={isLoading}
                />

                <InputField
                  icon={Envelope}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="Email Address *"
                  error={errors.email}
                  disabled={isLoading}
                />

                <InputField
                  icon={Lock}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Password *"
                  error={errors.password}
                  showToggle
                  onToggle={() => setShowPassword(!showPassword)}
                  toggleState={showPassword}
                  disabled={isLoading}
                />

                <InputField
                  icon={Lock}
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm Password *"
                  error={errors.confirmPassword}
                  showToggle
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  toggleState={showConfirmPassword}
                  disabled={isLoading}
                />

                {/* Terms and conditions */}
                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary mt-0.5"
                    />
                    <span className="text-sm text-slate-600">
                      I agree to the{' '}
                      <a href="#" className="text-primary hover:underline">Terms of Service</a>
                      {' '}and{' '}
                      <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                    </span>
                  </label>
                  {errors.terms && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-1 flex items-center gap-1"
                    >
                      <Warning size={12} weight="fill" />
                      {errors.terms}
                    </motion.p>
                  )}
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary to-accent text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkle size={20} />
                      </motion.div>
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight size={20} weight="bold" />
                    </>
                  )}
                </motion.button>

                {/* Features preview */}
                <div className="mt-4 p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Lightning size={16} weight="fill" className="text-amber-500" />
                    What you get with ThisAI ERP
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <CheckCircle size={14} weight="fill" className="text-green-500" />
                      GST Invoicing
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle size={14} weight="fill" className="text-green-500" />
                      Inventory Management
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle size={14} weight="fill" className="text-green-500" />
                      Business Reports
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle size={14} weight="fill" className="text-green-500" />
                      POS System
                    </div>
                  </div>
                </div>
              </motion.form>
            )}

            {/* Forgot Password Form */}
            {mode === 'forgot' && (
              <motion.form
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleForgotPassword}
                className="space-y-5"
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="flex items-center gap-1 text-sm text-slate-600 hover:text-primary mb-2"
                >
                  <CaretLeft size={16} />
                  Back to login
                </button>

                <div className="text-center mb-4">
                  <div className="inline-flex p-3 bg-amber-100 rounded-full mb-3">
                    <ShieldCheck size={28} weight="duotone" className="text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Reset your password</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Enter your email and we'll send you a reset link
                  </p>
                </div>

                <InputField
                  icon={Envelope}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="Email address"
                  error={errors.email}
                  disabled={isLoading}
                />

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-primary to-accent text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                >
                  Send Reset Link
                  <ArrowRight size={20} weight="bold" />
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          © 2025 ThisAI ERP. All rights reserved.
        </p>
      </motion.div>
    </div>
  )
}

export default Login
