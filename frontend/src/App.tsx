import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/useAuth'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingScreen from './components/LoadingScreen'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'
import FoldersAdminPage from './pages/FoldersAdminPage'
import DocTypesAdminPage from './pages/DocTypesAdminPage'
import TimelinePage from './pages/TimelinePage'
import { useHealthCheck } from './hooks/useHealthCheck'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen message="Checking authentication…" />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen message="Checking authentication…" />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { data: healthData } = useHealthCheck()
  useEffect(() => {
    const storeName = healthData?.store_name
    if (storeName) {
      document.title = `${storeName} UI`
    }
  }, [healthData?.store_name])

  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/folders"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <FoldersAdminPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/doc-types"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <DocTypesAdminPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timeline"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <TimelinePage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              {/* Per-page boundary so an error in MainPage doesn't kill the login route */}
              <ErrorBoundary>
                <MainPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  )
}
