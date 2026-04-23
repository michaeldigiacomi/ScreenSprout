import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Rewards from './pages/Rewards';
import Categories from './pages/Categories';
import GoalsRewards from './pages/GoalsRewards';
import Settings from './pages/Settings';
import FamilySharing from './pages/FamilySharing';
import Notifications from './pages/Notifications';
import TimeRequests from './pages/TimeRequests';
import ActivityTimeline from './pages/ActivityTimeline';
import WebFiltering from './pages/WebFiltering';
import LocationTracking from './pages/LocationTracking';
import AuditLogs from './pages/AuditLogs';
import Webhooks from './pages/Webhooks';
import Comparison from './pages/Comparison';
import GlobalAIChat from './components/GlobalAIChat';
import DashboardLayout from './layouts/DashboardLayout';
import analytics from './lib/analytics';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <>
      {children}
      <GlobalAIChat />
    </>
  );
};

// Export routes for testing (without BrowserRouter)
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Redirect old routes to new consolidated navigation */}
      <Route path="/live" element={<Navigate to="/" replace />} />
      <Route path="/rewards" element={<Navigate to="/goals-rewards" replace />} />

      {/* New Layout Route for Refactored Pages */}
      <Route element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
      </Route>

      {/* Legacy Routes (To be migrated) */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <Schedule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals-rewards"
        element={
          <ProtectedRoute>
            <GoalsRewards />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/family-sharing"
        element={
          <ProtectedRoute>
            <FamilySharing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/time-requests"
        element={
          <ProtectedRoute>
            <TimeRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity-timeline"
        element={
          <ProtectedRoute>
            <ActivityTimeline />
          </ProtectedRoute>
        }
      />
      <Route
        path="/web-filtering"
        element={
          <ProtectedRoute>
            <WebFiltering />
          </ProtectedRoute>
        }
      />
      <Route
        path="/location"
        element={
          <ProtectedRoute>
            <LocationTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <AuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/webhooks"
        element={
          <ProtectedRoute>
            <Webhooks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/comparison"
        element={
          <ProtectedRoute>
            <Comparison />
          </ProtectedRoute>
        }
      />

      {/* Catch all redirect to Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Initialize analytics on app mount
  useEffect(() => {
    analytics.init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
