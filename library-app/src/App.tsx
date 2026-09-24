import { Component, type ReactNode, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import InventoryList from './pages/InventoryList';
import AddItem from './pages/AddItem';
import ItemDetail from './pages/ItemDetail';
import { InventoryProvider } from './api/useInventory';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
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
        <div style={{ padding: '4rem', textTransform: 'none', textAlign: 'center', background: '#F0F4F8', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '2.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', maxWidth: '500px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
              Application Render Warning
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Stale cache or incompatible local data structure was detected. Resetting local inventory cache will restore normal dashboard operation.
            </p>
            <button
              onClick={this.handleReset}
              style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
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

function AppContent() {
  const [quantityFilter, setQuantityFilter] = useState(100);
  const [expiryFilter, setExpiryFilter] = useState(30);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="app-container">
      {/* Left Sidebar Fixed Height Split */}
      <Sidebar
        quantityFilter={quantityFilter}
        setQuantityFilter={setQuantityFilter}
        expiryFilter={expiryFilter}
        setExpiryFilter={setExpiryFilter}
      />

      {/* Main Viewport Content Area */}
      <div className="main-viewport">
        {/* Top Header Bar */}
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        {/* Dynamic Route Pages */}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                quantityFilter={quantityFilter}
                expiryFilter={expiryFilter}
                searchTerm={searchTerm}
              />
            }
          />
          <Route
            path="/inventory"
            element={
              <InventoryList
                quantityFilter={quantityFilter}
                expiryFilter={expiryFilter}
                searchTerm={searchTerm}
              />
            }
          />
          <Route path="/inventory/:id" element={<ItemDetail />} />
          <Route path="/add" element={<AddItem />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <InventoryProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </InventoryProvider>
    </ErrorBoundary>
  );
}

export default App;
