import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, errorMessage } from './client';
import type { InventoryItem, WorkflowReason } from './types';
import { useAuth } from './useAuth';
import { DEFAULT_THRESHOLDS, type RiskThresholds } from '../utils/risk';

export interface PharmacySettings extends RiskThresholds {
  enable90d: boolean;
  enable60d: boolean;
  enable30d: boolean;
  enable7d: boolean;
  enable0d: boolean;
  pharmacyName: string;
  licenseNumber: string | null;
  currency: string;
  timezone: string;
  lowStockThreshold: number;
}

interface InventoryContextType {
  items: InventoryItem[];
  loading: boolean;
  /** Problem loading the list (shown on the inventory page). */
  error: string | null;
  /** Last failed action (shown as a dismissible banner). */
  actionError: string | null;
  clearActionError: () => void;
  settings: PharmacySettings | null;
  thresholds: RiskThresholds;
  refresh: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id'>) => Promise<InventoryItem | null>;
  deleteItem: (id: string) => Promise<boolean>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  acknowledgeItem: (id: string) => Promise<void>;
  flagItemForReview: (id: string, note: string) => Promise<void>;
  closeAdminFlag: (id: string, status: 'resolved' | 'dismissed', note?: string) => Promise<void>;
  quarantineItem: (id: string, reason: WorkflowReason) => Promise<void>;
  addItemNote: (id: string, note: string) => Promise<void>;
  requestSupplierReturn: (id: string, note?: string) => Promise<void>;
  processSupplierReturn: (id: string) => Promise<void>;
  disposeItem: (id: string, reason: WorkflowReason, note?: string) => Promise<void>;
  recordSale: (id: string, units: number) => Promise<boolean>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

/** The API sends null for absent/hidden fields; the UI treats them as undefined. */
function normalize(raw: Record<string, unknown>): InventoryItem {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== null) out[key] = value;
  }
  return out as unknown as InventoryItem;
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PharmacySettings | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Record<string, unknown>[]>('/items');
      setItems(data.map(normalize));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setSettings(await api<PharmacySettings>('/settings'));
    } catch {
      /* keep defaults; the inventory itself still carries server-computed risk bands */
    }
  }, []);

  // Load when someone signs in; clear everything on sign-out.
  useEffect(() => {
    if (user?.id) {
      void refresh();
      void refreshSettings();
    } else {
      setItems([]);
      setSettings(null);
      setError(null);
    }
  }, [user?.id, user?.role, refresh, refreshSettings]);

  const replace = (updated: Record<string, unknown>) => {
    const item = normalize(updated);
    setItems(prev => {
      const exists = prev.some(i => i.id === item.id);
      return exists ? prev.map(i => (i.id === item.id ? item : i)) : [item, ...prev];
    });
    return item;
  };

  /** Runs an item action; on success swaps in the server's copy of the item, on failure shows the reason. */
  const act = async (id: string, path: string, body?: unknown): Promise<boolean> => {
    try {
      replace(await api<Record<string, unknown>>(`/items/${id}${path}`, { method: 'POST', body: body ?? {} }));
      setActionError(null);
      return true;
    } catch (err) {
      setActionError(errorMessage(err));
      return false;
    }
  };

  const addItem = async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem | null> => {
    try {
      const created = await api<Record<string, unknown>>('/items', {
        method: 'POST',
        body: {
          name: item.name,
          category: item.category,
          batchNo: item.batchNo || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice || undefined,
          unitCostGhs: item.unitCostGhs,
          sellingPriceGhs: item.sellingPriceGhs,
          expiryDate: item.expiryDate,
          manufacturingDate: item.manufacturingDate || undefined,
          dateReceived: item.dateReceived || undefined,
          supplier: item.supplier,
          location: item.location ?? item.storageLocation,
          status: item.status === 'Low Stock' ? undefined : item.status,
          barcode: item.barcode || undefined,
          sku: item.sku || undefined,
        },
      });
      setActionError(null);
      return replace(created);
    } catch (err) {
      setActionError(errorMessage(err));
      return null;
    }
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    try {
      await api(`/items/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(item => item.id !== id));
      setActionError(null);
      return true;
    } catch (err) {
      setActionError(errorMessage(err));
      return false;
    }
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const body: Record<string, unknown> = {};
    if ('photoUrl' in updates) body.photoUrl = updates.photoUrl ?? null;
    if ('location' in updates || 'storageLocation' in updates) body.location = updates.location ?? updates.storageLocation ?? null;
    for (const key of ['name', 'category', 'supplier', 'unitCostGhs', 'sellingPriceGhs', 'expiryDate', 'manufacturingDate'] as const) {
      if (key in updates) body[key] = updates[key];
    }
    try {
      replace(await api<Record<string, unknown>>(`/items/${id}`, { method: 'PATCH', body }));
      setActionError(null);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const thresholds = useMemo<RiskThresholds>(() => (settings ? {
    criticalDays: settings.criticalDays,
    actionDays: settings.actionDays,
    monitorDays: settings.monitorDays,
    safeDays: settings.safeDays,
  } : DEFAULT_THRESHOLDS), [settings]);

  const value: InventoryContextType = {
    items,
    loading,
    error,
    actionError,
    clearActionError: () => setActionError(null),
    settings,
    thresholds,
    refresh,
    refreshSettings,
    addItem,
    deleteItem,
    updateItem,
    acknowledgeItem: async id => { await act(id, '/acknowledge'); },
    flagItemForReview: async (id, note) => { await act(id, '/flag', { note }); },
    closeAdminFlag: async (id, status, note = '') => { await act(id, '/flag/close', { status, note: note || undefined }); },
    quarantineItem: async (id, reason) => { await act(id, '/quarantine', { reason }); },
    addItemNote: async (id, note) => { if (note.trim()) await act(id, '/notes', { note: note.trim() }); },
    requestSupplierReturn: async (id, note = '') => { await act(id, '/return-request', { note: note.trim() || undefined }); },
    processSupplierReturn: async id => { await act(id, '/return-process'); },
    disposeItem: async (id, reason, note = '') => { await act(id, '/dispose', { reason, note: note.trim() || undefined }); },
    recordSale: async (id, units) => (Number.isInteger(units) && units > 0 ? act(id, '/sell', { units }) : false),
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
