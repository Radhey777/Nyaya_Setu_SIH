import { Link } from 'react-router-dom'

/**
 * 404 — rendered for any unmatched route.
 * Stub page; will be styled in a later step.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-indigo-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Not Found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you are looking for does not exist.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2
            text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none
            focus:ring-2 focus:ring-indigo-500"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
