// Shapes shared with the backend /items API (camelCase JSON, one item per batch).
// Cost, supplier and receipt fields are null for dispensers: the server enforces this.

export interface InventoryItem {
  id: string;
  productId?: string;
  sku?: string | null;
  barcode?: string | null;
  unit?: string;
  name: string;
  productName?: string;
  category: string;
  batchNo: string;
  batchNumber?: string;
  quantity: number;
  unitsSold?: number;
  unitPrice: number;
  unitCostGhs?: number;
  sellingPriceGhs?: number;
  expiryDate: string;
  manufacturingDate?: string;
  dateReceived?: string;
  photoUrl?: string;
  daysToExpiry?: number;
  supplier?: string;
  location?: string;
  storageLocation?: string;
  status?: 'In Stock' | 'Low Stock' | 'Quarantined' | 'Pending Return' | 'Disposed';
  riskStatus?: 'Safe' | 'Monitor' | 'Action Required' | 'Critical' | 'Expired';
  recommendedAction?: string;
  velocity?: 'Fast' | 'Moderate' | 'Slow' | 'Dead';
  acknowledged?: { actorId: string; actorName: string; at: string };
  activityLog?: InventoryActivity[];
  adminFlag?: { status: 'open' | 'resolved' | 'dismissed'; note: string; actorId: string; actorName: string; at: string; closedBy?: string; closedAt?: string; resolutionNote?: string };
  supplierReturnRequest?: { status: 'requested' | 'processed'; supplierName?: string; supplierBatchNo: string; requestedBy: string; requestedAt: string; note?: string; processedBy?: string; processedAt?: string };
  quarantineReason?: WorkflowReason;
  disposal?: { reason: WorkflowReason; quantity: number; actorId: string; actorName: string; at: string; note?: string };
}

export type WorkflowReason = 'Expired' | 'Damaged' | 'Supplier Return' | 'Other';
export interface InventoryActivity {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  at: string;
  note?: string;
}
