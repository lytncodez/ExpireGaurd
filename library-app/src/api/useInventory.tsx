import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { mockItems, type InventoryItem } from './mockData';

interface InventoryContextType {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  addItem: (item: Omit<InventoryItem, 'id'>) => void;
  deleteItem: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('expireguard_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall back to mock items
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

  return (
    <InventoryContext.Provider value={{ items, loading, error, addItem, deleteItem }}>
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
