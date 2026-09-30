import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { mockItems, type InventoryItem } from './mockData';

interface InventoryContextType {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  addItem: (item: Omit<InventoryItem, 'id'>) => void;
  deleteItem: (id: string) => void;
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
    const newItem: InventoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...item,
    };
    setItems(prev => [newItem, ...prev]);
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const resetToMock = () => {
    localStorage.removeItem('expireguard_items');
    setItems(mockItems);
  };

  return (
    <InventoryContext.Provider value={{ items, loading, error, addItem, deleteItem, resetToMock }}>
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
