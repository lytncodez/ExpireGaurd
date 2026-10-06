import { Component, type ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';
import OnboardingTour from './components/OnboardingTour';
import Dashboard from './pages/Dashboard';
import InventoryList from './pages/InventoryList';
import AddItem from './pages/AddItem';
import ItemDetail from './pages/ItemDetail';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import { InventoryProvider } from './api/useInventory';
import { AuthProvider, useAuth } from './api/useAuth';

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error?: Error; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('expireguard_items');
    this.setState({ hasError: false });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '4rem', textAlign: 'center', background: '#F5F6FA', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '2.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', maxWidth: '500px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E3A4C', marginBottom: '0.75rem' }}>
              Application Render Warning
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Stale cache or incompatible local data structure was detected. Resetting local inventory cache will restore normal operation.
            </p>
            <button
              onClick={this.handleReset}
              style={{ background: '#3B3593', color: '#FFFFFF', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Reset Data &amp; Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

// ─── Authenticated App Shell ─────────────────────────────────────────────────
function AppShell() {
  const [quantityFilter, setQuantityFilter] = useState<number>(() => {
    const saved = window.localStorage.getItem('expireguard_quantity_filter');
    const parsed = saved ? Number(saved) : 100;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 100;
  });
  const [expiryFilter, setExpiryFilter] = useState<number>(() => {
    const saved = window.localStorage.getItem('expireguard_expiry_filter');
    const parsed = saved ? Number(saved) : 30;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = window.localStorage.getItem('expireguard_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('expireguard_quantity_filter', String(quantityFilter));
  }, [quantityFilter]);

  useEffect(() => {
    localStorage.setItem('expireguard_expiry_filter', String(expiryFilter));
  }, [expiryFilter]);

  useEffect(() => {
    localStorage.setItem('expireguard_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="app-container">
      <Sidebar
        quantityFilter={quantityFilter}
        setQuantityFilter={setQuantityFilter}
        expiryFilter={expiryFilter}
        setExpiryFilter={setExpiryFilter}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      <div className="main-viewport">
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <Dashboard
              quantityFilter={quantityFilter}
              expiryFilter={expiryFilter}
              searchTerm={searchTerm}
            />
          } />
          <Route path="/inventory" element={
            <InventoryList
              searchTerm={searchTerm}
            />
          } />
          <Route path="/inventory/:id" element={<ItemDetail />} />
          <Route path="/add" element={<AddItem />} />
          <Route path="/alerts" element={<Alerts searchTerm={searchTerm} />} />
          <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
          <Route path="/insights" element={<AdminRoute><Insights /></AdminRoute>} />
          <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />

          {/* Fallback for authenticated users */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Persistent bottom tab bar for mobile viewports */}
        <MobileBottomNav />
      </div>
      <OnboardingTour />
    </div>
  );
}

// ─── Root Router ──────────────────────────────────────────────────────────────
function AppRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/signin" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignIn />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignUp />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

      {/* Protected app routes */}
      <Route path="/*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <InventoryProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </InventoryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
