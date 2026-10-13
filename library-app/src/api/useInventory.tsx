import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mockItems, type InventoryActivity, type InventoryItem, type WorkflowReason } from './mockData';
import { useAuth } from './useAuth';

interface InventoryContextType {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  addItem: (item: Omit<InventoryItem, 'id'>) => void;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  acknowledgeItem: (id: string) => void;
  flagItemForReview: (id: string, note: string) => void;
  closeAdminFlag: (id: string, status: 'resolved' | 'dismissed', note?: string) => void;
  quarantineItem: (id: string, reason: WorkflowReason) => void;
  addItemNote: (id: string, note: string) => void;
  requestSupplierReturn: (id: string, note?: string) => void;
  processSupplierReturn: (id: string) => void;
  disposeItem: (id: string, reason: WorkflowReason, note?: string) => void;
  recordSale: (id: string, units: number) => void;
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
    unitsSold: typeof item.unitsSold === 'number' && Number.isFinite(item.unitsSold) ? Math.max(0, item.unitsSold) : undefined,
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
    acknowledged: item.acknowledged && typeof item.acknowledged.at === 'string' ? item.acknowledged : undefined,
    activityLog: Array.isArray(item.activityLog) ? item.activityLog.filter((entry: unknown) => entry && typeof entry === 'object') as InventoryActivity[] : [],
    adminFlag: item.adminFlag && typeof item.adminFlag.at === 'string' ? item.adminFlag : undefined,
    supplierReturnRequest: item.supplierReturnRequest && typeof item.supplierReturnRequest.requestedAt === 'string' ? item.supplierReturnRequest : undefined,
    quarantineReason: item.quarantineReason,
    disposal: item.disposal && typeof item.disposal.at === 'string' ? item.disposal : undefined,
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

  const addActivity = (id: string, action: string, note?: string, updates: Partial<InventoryItem> = {}) => {
    const actor = { actorId: user?.id ?? 'unknown', actorName: user?.name ?? 'Staff member' };
    const activity: InventoryActivity = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, action, ...actor, at: new Date().toISOString(), ...(note ? { note } : {}) };
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates, activityLog: [...(item.activityLog ?? []), activity] } : item));
  };

  const acknowledgeItem = (id: string) => {
    if (!user) return;
    const at = new Date().toISOString();
    addActivity(id, 'Acknowledged expiry alert', undefined, { acknowledged: { actorId: user.id, actorName: user.name, at } });
  };

  const flagItemForReview = (id: string, note: string) => {
    if (!user) return;
    const at = new Date().toISOString();
    addActivity(id, 'Flagged for Admin Review', note, { adminFlag: { status: 'open', note, actorId: user.id, actorName: user.name, at } });
  };

  const closeAdminFlag = (id: string, status: 'resolved' | 'dismissed', note = '') => {
    if (user?.role !== 'admin') return;
    const at = new Date().toISOString();
    const action = status === 'resolved' ? 'Resolved Admin Review flag' : 'Dismissed Admin Review flag';
    const activity: InventoryActivity = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, action, actorId: user.id, actorName: user.name, at, ...(note ? { note } : {}) };
    setItems(prev => prev.map(item => item.id === id ? {
      ...item,
      adminFlag: item.adminFlag ? { ...item.adminFlag, status, closedBy: user.name, closedAt: at, ...(note ? { resolutionNote: note } : {}) } : undefined,
      activityLog: [...(item.activityLog ?? []), activity],
    } : item));
  };

  const quarantineItem = (id: string, reason: WorkflowReason) => {
    addActivity(id, 'Moved to Quarantine', `Reason: ${reason}`, { status: 'Quarantined', quarantineReason: reason });
  };

  const addItemNote = (id: string, note: string) => {
    if (!note.trim()) return;
    addActivity(id, 'Added batch note', note.trim());
  };

  const requestSupplierReturn = (id: string, note = '') => {
    if (!user) return;
    const at = new Date().toISOString();
    const activity: InventoryActivity = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, action: 'Requested supplier return', actorId: user.id, actorName: user.name, at, ...(note.trim() ? { note: note.trim() } : {}) };
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (item.supplierReturnRequest?.status === 'requested') return item;
      const request = {
        status: 'requested' as const,
        supplierName: item.supplier || 'Supplier not recorded',
        supplierBatchNo: item.batchNo,
        requestedBy: user.name,
        requestedAt: at,
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      return { ...item, status: 'Pending Return', supplierReturnRequest: request, activityLog: [...(item.activityLog ?? []), activity] };
    }));
  };

  const processSupplierReturn = (id: string) => {
    if (user?.role !== 'admin') return;
    const at = new Date().toISOString();
    const activity: InventoryActivity = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, action: 'Processed supplier return request', actorId: user.id, actorName: user.name, at };
    setItems(prev => prev.map(item => {
      if (item.id !== id || !item.supplierReturnRequest) return item;
      return { ...item, supplierReturnRequest: { ...item.supplierReturnRequest, status: 'processed', processedBy: user.name, processedAt: at }, status: 'Quarantined', quarantineReason: 'Supplier Return', activityLog: [...(item.activityLog ?? []), activity] };
    }));
  };

  const disposeItem = (id: string, reason: WorkflowReason, note = '') => {
    if (!user) return;
    const at = new Date().toISOString();
    const activity: InventoryActivity = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, action: 'Confirmed physical disposal', actorId: user.id, actorName: user.name, at, note: `Reason: ${reason}${note.trim() ? ` — ${note.trim()}` : ''}` };
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, status: 'Disposed', disposal: { reason, quantity: item.quantity, actorId: user.id, actorName: user.name, at, ...(note.trim() ? { note: note.trim() } : {}) }, quantity: 0, activityLog: [...(item.activityLog ?? []), activity] };
    }));
  };

  const recordSale = (id: string, units: number) => {
    if (!user || !Number.isInteger(units) || units <= 0) return;
    const at = new Date().toISOString();
    setItems(prev => prev.map(item => {
      const expired = new Date(item.expiryDate).getTime() < Date.now();
      const unavailable = item.status === 'Quarantined' || item.status === 'Pending Return' || item.status === 'Disposed';
      if (item.id !== id || expired || unavailable || item.quantity < units) return item;
      const activity: InventoryActivity = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        action: `Dispensed ${units.toLocaleString()} units`,
        actorId: user.id,
        actorName: user.name,
        at,
      };
      const quantity = item.quantity - units;
      return {
        ...item,
        quantity,
        unitsSold: (item.unitsSold ?? 0) + units,
        status: quantity === 0 ? 'Low Stock' : item.status,
        activityLog: [...(item.activityLog ?? []), activity],
      };
    }));
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
    supplierReturnRequest: item.supplierReturnRequest ? { ...item.supplierReturnRequest, supplierName: undefined } : undefined,
  })), [items, user?.role]);

  return (
    <InventoryContext.Provider value={{ items: roleScopedItems, loading, error, addItem, deleteItem, updateItem, acknowledgeItem, flagItemForReview, closeAdminFlag, quarantineItem, addItemNote, requestSupplierReturn, processSupplierReturn, disposeItem, recordSale, resetToMock }}>
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
