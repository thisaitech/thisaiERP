import React from 'react'
import { motion } from 'framer-motion'
import { Warning, ArrowCounterClockwise } from '@phosphor-icons/react'
import { cn } from '../lib/utils'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

class ErrorBoundaryComponent extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full text-center"
          >
            <div className="inline-flex p-4 bg-red-100 dark:bg-red-900/30 rounded-2xl mb-4">
              <Warning size={48} weight="duotone" className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-2">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Please try again or contact support if the problem persists.
            </p>
            <button
              onClick={this.handleReset}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                "bg-brand-gradient text-white shadow-lg hover:shadow-xl active:scale-95"
              )}
            >
              <ArrowCounterClockwise size={20} />
              Try Again
            </button>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

export const ErrorBoundary = ErrorBoundaryComponent
