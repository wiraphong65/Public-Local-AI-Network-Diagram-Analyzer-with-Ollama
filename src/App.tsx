import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { Login } from './components/Login';
import MainLayout from './components/MainLayout';
import { ProjectDashboard } from './components/ProjectDashboard';
import { useAuth } from './contexts/AuthContext';
import { useProject } from './contexts/ProjectContext';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { currentProject, loading: projectLoading } = useProject();

  // รอให้ authentication และ project loading เสร็จ
  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!user ? <Login /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/" 
        element={
          user ? (
            currentProject ? <MainLayout /> : <ProjectDashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          user ? <ProjectDashboard /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/project/:id" 
        element={
          user ? <MainLayout /> : <Navigate to="/login" replace />
        } 
      />
      {/* Catch all route - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProjectProvider>
          <AppContent />
          <Toaster />
        </ProjectProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
