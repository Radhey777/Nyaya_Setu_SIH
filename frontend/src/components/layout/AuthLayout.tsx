import React from 'react'
import { Shield } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-indigo-600 shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AICTE C³</h1>
            <p className="mt-1 text-sm text-gray-500">
              Institutional Case Coordination &amp; Resolution Intelligence
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {children}
        </div>

        <p className="text-center text-xs text-gray-400">
          Smart India Hackathon — Prototype. Not an official AICTE system.
        </p>
      </div>
    </div>
  )
}
