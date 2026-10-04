export interface InventoryItem {
  id: string;
  name: string;
  productName?: string;
  category: string;
  batchNo: string;
  batchNumber?: string;
  quantity: number;
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

const dayMs = 24 * 60 * 60 * 1000;

export const mockItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Amoxicillin 500mg',
    productName: 'Amoxicillin 500mg',
    category: 'Antibiotics',
    batchNo: 'AMX-2026-08',
    batchNumber: 'AMX-2026-08',
    quantity: 450,
    unitPrice: 18.50,
    unitCostGhs: 18.5,
    sellingPriceGhs: 28.0,
    expiryDate: new Date(Date.now() + 23 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 180 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 90 * dayMs).toISOString(),
    daysToExpiry: 23,
    supplier: 'PharmaCorp Inc.',
    location: 'Aisle A1 - Shelf 2',
    storageLocation: 'Aisle A1 - Shelf 2',
    status: 'In Stock',
    riskStatus: 'Action Required',
    recommendedAction: 'Prioritise stock for sale',
    velocity: 'Fast',
  },
  {
    id: '2',
    name: 'Aspirin 81mg EC',
    productName: 'Aspirin 81mg EC',
    category: 'Analgesics',
    batchNo: 'ASP-1049-B',
    batchNumber: 'ASP-1049-B',
    quantity: 120,
    unitPrice: 8.75,
    unitCostGhs: 8.75,
    sellingPriceGhs: 15.5,
    expiryDate: new Date(Date.now() - 5 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 400 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 200 * dayMs).toISOString(),
    daysToExpiry: -5,
    supplier: 'MediSupply Co.',
    location: 'Bay B3 - Rack 1',
    storageLocation: 'Bay B3 - Rack 1',
    status: 'Quarantined',
    riskStatus: 'Expired',
    recommendedAction: 'Quarantine and return to supplier',
    velocity: 'Slow',
  },
  {
    id: '3',
    name: 'Sterile Bandage Pack',
    productName: 'Sterile Bandage Pack',
    category: 'First Aid',
    batchNo: 'BDG-9921-X',
    batchNumber: 'BDG-9921-X',
    quantity: 850,
    unitPrice: 4.20,
    unitCostGhs: 4.2,
    sellingPriceGhs: 7.0,
    expiryDate: new Date(Date.now() + 3 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 240 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 120 * dayMs).toISOString(),
    daysToExpiry: 3,
    supplier: 'Global Health Ltd.',
    location: 'Aisle C2 - Shelf 4',
    storageLocation: 'Aisle C2 - Shelf 4',
    status: 'In Stock',
    riskStatus: 'Critical',
    recommendedAction: 'Discount immediately and move to front shelf',
    velocity: 'Moderate',
  },
  {
    id: '4',
    name: 'Metformin 850mg',
    productName: 'Metformin 850mg',
    category: 'Antidiabetics',
    batchNo: 'MET-007-D',
    batchNumber: 'MET-007-D',
    quantity: 620,
    unitPrice: 24.00,
    unitCostGhs: 24,
    sellingPriceGhs: 36.0,
    expiryDate: new Date(Date.now() + 28 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 300 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 150 * dayMs).toISOString(),
    daysToExpiry: 28,
    supplier: 'Apex LifeSciences',
    location: 'Aisle A3 - Shelf 1',
    storageLocation: 'Aisle A3 - Shelf 1',
    status: 'In Stock',
    riskStatus: 'Action Required',
    recommendedAction: 'Review discount window',
    velocity: 'Moderate',
  },
  {
    id: '5',
    name: 'Vitamin C 1000mg Chewable',
    productName: 'Vitamin C 1000mg Chewable',
    category: 'Supplements',
    batchNo: 'VTC-8840-A',
    batchNumber: 'VTC-8840-A',
    quantity: 800,
    unitPrice: 12.00,
    unitCostGhs: 12,
    sellingPriceGhs: 18.5,
    expiryDate: new Date(Date.now() + 45 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 160 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 80 * dayMs).toISOString(),
    daysToExpiry: 45,
    supplier: 'NutraVital Labs',
    location: 'Bay D1 - Rack 3',
    storageLocation: 'Bay D1 - Rack 3',
    status: 'In Stock',
    riskStatus: 'Monitor',
    recommendedAction: 'Monitor stock rotation',
    velocity: 'Fast',
  },
  {
    id: '6',
    name: 'COVID-19 Rapid Antigen Test',
    productName: 'COVID-19 Rapid Antigen Test',
    category: 'Diagnostics',
    batchNo: 'CS-012-RET',
    batchNumber: 'CS-012-RET',
    quantity: 340,
    unitPrice: 15.00,
    unitCostGhs: 15,
    sellingPriceGhs: 24.0,
    expiryDate: new Date(Date.now() + 6 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 320 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 160 * dayMs).toISOString(),
    daysToExpiry: 6,
    supplier: 'BioDiagnostics Tech',
    location: 'Cold Storage C1',
    storageLocation: 'Cold Storage C1',
    status: 'Pending Return',
    riskStatus: 'Critical',
    recommendedAction: 'Return to supplier and raise review',
    velocity: 'Dead',
  },
  {
    id: '7',
    name: 'Omeprazole 20mg Delayed Release',
    productName: 'Omeprazole 20mg Delayed Release',
    category: 'Gastrointestinal',
    batchNo: 'OMP-4402-E',
    batchNumber: 'OMP-4402-E',
    quantity: 210,
    unitPrice: 32.50,
    unitCostGhs: 32.5,
    sellingPriceGhs: 46.0,
    expiryDate: new Date(Date.now() + 120 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 220 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 110 * dayMs).toISOString(),
    daysToExpiry: 120,
    supplier: 'PharmaCorp Inc.',
    location: 'Aisle B1 - Shelf 3',
    storageLocation: 'Aisle B1 - Shelf 3',
    status: 'In Stock',
    riskStatus: 'Safe',
    recommendedAction: 'Keep in regular rotation',
    velocity: 'Moderate',
  },
  {
    id: '8',
    name: 'Insulin Glargine Pen 100U/ml',
    productName: 'Insulin Glargine Pen 100U/ml',
    category: 'Biologics',
    batchNo: 'INS-0091-C',
    batchNumber: 'INS-0091-C',
    quantity: 95,
    unitPrice: 85.00,
    unitCostGhs: 85,
    sellingPriceGhs: 120.0,
    expiryDate: new Date(Date.now() + 18 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 260 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 130 * dayMs).toISOString(),
    daysToExpiry: 18,
    supplier: 'BioLab Global',
    location: 'Cold Storage C2',
    storageLocation: 'Cold Storage C2',
    status: 'Low Stock',
    riskStatus: 'Action Required',
    recommendedAction: 'Prioritise stock for sale',
    velocity: 'Fast',
  },
  {
    id: '9',
    name: 'Ibuprofen 400mg Liquid Gels',
    productName: 'Ibuprofen 400mg Liquid Gels',
    category: 'Analgesics',
    batchNo: 'IBU-7721-F',
    batchNumber: 'IBU-7721-F',
    quantity: 500,
    unitPrice: 9.80,
    unitCostGhs: 9.8,
    sellingPriceGhs: 16.0,
    expiryDate: new Date(Date.now() + 52 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 140 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 70 * dayMs).toISOString(),
    daysToExpiry: 52,
    supplier: 'MediSupply Co.',
    location: 'Bay A2 - Rack 2',
    storageLocation: 'Bay A2 - Rack 2',
    status: 'In Stock',
    riskStatus: 'Monitor',
    recommendedAction: 'Continue monitoring rotation',
    velocity: 'Fast',
  },
  {
    id: '10',
    name: 'Surgical Face Masks 50s',
    productName: 'Surgical Face Masks 50s',
    category: 'PPE',
    batchNo: 'MSK-1102-M',
    batchNumber: 'MSK-1102-M',
    quantity: 1200,
    unitPrice: 6.50,
    unitCostGhs: 6.5,
    sellingPriceGhs: 10.5,
    expiryDate: new Date(Date.now() - 14 * dayMs).toISOString(),
    manufacturingDate: new Date(Date.now() - 500 * dayMs).toISOString(),
    dateReceived: new Date(Date.now() - 250 * dayMs).toISOString(),
    daysToExpiry: -14,
    supplier: 'Global Health Ltd.',
    location: 'Warehouse Box W4',
    storageLocation: 'Warehouse Box W4',
    status: 'Quarantined',
    riskStatus: 'Expired',
    recommendedAction: 'Review disposal and vendor claim',
    velocity: 'Slow',
  }
];
