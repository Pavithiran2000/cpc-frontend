'use client'

import React from 'react'

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-white/60">Something went wrong</p>
        <p className="max-w-sm text-xs text-white/30">
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => this.setState({ hasError: false })}
          className="mt-2 rounded-md bg-[#E85D04]/10 px-3 py-1.5 text-xs font-medium text-[#E85D04] hover:bg-[#E85D04]/20"
        >
          Try again
        </button>
      </div>
    )
  }
}
