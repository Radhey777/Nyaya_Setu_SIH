import { useNavigate } from 'react-router-dom'

/**
 * 403 — rendered when an authenticated user lacks the role required for a route.
 * Stub page; will be styled in a later step.
 */
export default function AccessDeniedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-indigo-600">403</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-sm text-gray-500">
          You do not have permission to view this page.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2
            text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none
            focus:ring-2 focus:ring-indigo-500"
        >
          Go back
        </button>
      </div>
    </div>
  )
}
