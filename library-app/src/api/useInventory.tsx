import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mockItems, type InventoryItem } from './mockData';
import { useAuth } from './useAuth';

interface InventoryContextType {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  addItem: (item: Omit<InventoryItem, 'id'>) => void;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  resetToMock: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

function sanitizeItems(parsed: any[]): InventoryItem[] {
  if (!Array.isArray(parsed) || parsed.length === 0) return mockItems;
  return parsed.map((item, idx) => ({
    id: String(item.id || `item-${idx}`),
    name: String(item.name || item.productName || 'Unnamed Product'),
    productName: String(item.productName || item.name || 'Unnamed Product'),
    category: String(item.category || 'General'),
    batchNo: String(item.batchNo || item.batchNumber || `BATCH-${1000 + idx}`),
    batchNumber: String(item.batchNumber || item.batchNo || `BATCH-${1000 + idx}`),
    quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0,
    unitPrice: typeof item.unitPrice === 'number' && !isNaN(item.unitPrice) ? item.unitPrice : (typeof item.unitCostGhs === 'number' ? item.unitCostGhs : 10.0),
    unitCostGhs: typeof item.unitCostGhs === 'number' && !isNaN(item.unitCostGhs) ? item.unitCostGhs : (typeof item.unitPrice === 'number' ? item.unitPrice : 10.0),
    sellingPriceGhs: typeof item.sellingPriceGhs === 'number' && !isNaN(item.sellingPriceGhs) ? item.sellingPriceGhs : undefined,
    expiryDate: item.expiryDate || new Date().toISOString(),
    manufacturingDate: item.manufacturingDate || undefined,
    dateReceived: item.dateReceived || undefined,
    photoUrl: typeof item.photoUrl === 'string' ? item.photoUrl : undefined,
    daysToExpiry: typeof item.daysToExpiry === 'number' ? item.daysToExpiry : undefined,
    supplier: String(item.supplier || 'PharmaCorp Inc.'),
    location: String(item.location || item.storageLocation || 'Aisle A1 - Shelf 1'),
    storageLocation: String(item.storageLocation || item.location || 'Aisle A1 - Shelf 1'),
    status: item.status || 'In Stock',
    riskStatus: item.riskStatus || undefined,
    recommendedAction: item.recommendedAction || 'Review stock rotation',
    velocity: item.velocity || 'Moderate',
  }));
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('expireguard_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return sanitizeItems(parsed);
      } catch {
        return mockItems;
      }
    }
    return mockItems;
  });

  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('expireguard_items', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist inventory data to localStorage', e);
    }
  }, [items]);

  const addItem = (item: Omit<InventoryItem, 'id'>) => {
    const entry = user?.role === 'admin' ? item : {
      ...item,
      unitPrice: 0,
      unitCostGhs: undefined,
      supplier: undefined,
      dateReceived: undefined,
    };
    const newItem: InventoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...entry,
    };
    setItems(prev => [newItem, ...prev]);
  };

  const deleteItem = (id: string) => {
    if (user?.role !== 'admin') return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const resetToMock = () => {
    localStorage.removeItem('expireguard_items');
    setItems(mockItems);
  };

  const roleScopedItems = useMemo(() => user?.role === 'admin' ? items : items.map(item => ({
    ...item,
    unitPrice: item.sellingPriceGhs ?? 0,
    unitCostGhs: undefined,
    supplier: undefined,
    dateReceived: undefined,
  })), [items, user?.role]);

  return (
    <InventoryContext.Provider value={{ items: roleScopedItems, loading, error, addItem, deleteItem, updateItem, resetToMock }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
