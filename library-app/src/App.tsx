import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import InventoryList from './pages/InventoryList';
import AddItem from './pages/AddItem';
import ItemDetail from './pages/ItemDetail';
import { InventoryProvider } from './api/useInventory';

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
    <InventoryProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </InventoryProvider>
  );
}

export default App;
