export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  batchNo: string;
  quantity: number;
  unitPrice: number;
  expiryDate: string; // ISO format
  supplier: string;
  location: string;
  status: 'In Stock' | 'Low Stock' | 'Quarantined' | 'Pending Return';
}

const dayMs = 24 * 60 * 60 * 1000;

export const mockItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Amoxicillin 500mg',
    category: 'Antibiotics',
    batchNo: 'AMX-2026-08',
    quantity: 450,
    unitPrice: 18.50,
    expiryDate: new Date(Date.now() + 23 * dayMs).toISOString(), // Action Required (23 days)
    supplier: 'PharmaCorp Inc.',
    location: 'Aisle A1 - Shelf 2',
    status: 'In Stock',
  },
  {
    id: '2',
    name: 'Aspirin 81mg EC',
    category: 'Analgesics',
    batchNo: 'ASP-1049-B',
    quantity: 120,
    unitPrice: 8.75,
    expiryDate: new Date(Date.now() - 5 * dayMs).toISOString(), // Expired (-5 days)
    supplier: 'MediSupply Co.',
    location: 'Bay B3 - Rack 1',
    status: 'Quarantined',
  },
  {
    id: '3',
    name: 'Sterile Bandage Pack',
    category: 'First Aid',
    batchNo: 'BDG-9921-X',
    quantity: 850,
    unitPrice: 4.20,
    expiryDate: new Date(Date.now() + 3 * dayMs).toISOString(), // Critical (3 days)
    supplier: 'Global Health Ltd.',
    location: 'Aisle C2 - Shelf 4',
    status: 'In Stock',
  },
  {
    id: '4',
    name: 'Metformin 850mg',
    category: 'Antidiabetics',
    batchNo: 'MET-007-D',
    quantity: 620,
    unitPrice: 24.00,
    expiryDate: new Date(Date.now() + 28 * dayMs).toISOString(), // Action Required (28 days)
    supplier: 'Apex LifeSciences',
    location: 'Aisle A3 - Shelf 1',
    status: 'In Stock',
  },
  {
    id: '5',
    name: 'Vitamin C 1000mg Chewable',
    category: 'Supplements',
    batchNo: 'VTC-8840-A',
    quantity: 800,
    unitPrice: 12.00,
    expiryDate: new Date(Date.now() + 45 * dayMs).toISOString(), // Monitor (45 days)
    supplier: 'NutraVital Labs',
    location: 'Bay D1 - Rack 3',
    status: 'In Stock',
  },
  {
    id: '6',
    name: 'COVID-19 Rapid Antigen Test',
    category: 'Diagnostics',
    batchNo: 'CS-012-RET',
    quantity: 340,
    unitPrice: 15.00,
    expiryDate: new Date(Date.now() + 6 * dayMs).toISOString(), // Critical (6 days)
    supplier: 'BioDiagnostics Tech',
    location: 'Cold Storage C1',
    status: 'Pending Return',
  },
  {
    id: '7',
    name: 'Omeprazole 20mg Delayed Release',
    category: 'Gastrointestinal',
    batchNo: 'OMP-4402-E',
    quantity: 210,
    unitPrice: 32.50,
    expiryDate: new Date(Date.now() + 120 * dayMs).toISOString(), // Safe (120 days)
    supplier: 'PharmaCorp Inc.',
    location: 'Aisle B1 - Shelf 3',
    status: 'In Stock',
  },
  {
    id: '8',
    name: 'Insulin Glargine Pen 100U/ml',
    category: 'Biologics',
    batchNo: 'INS-0091-C',
    quantity: 95,
    unitPrice: 85.00,
    expiryDate: new Date(Date.now() + 18 * dayMs).toISOString(), // Action Required (18 days)
    supplier: 'BioLab Global',
    location: 'Cold Storage C2',
    status: 'Low Stock',
  },
  {
    id: '9',
    name: 'Ibuprofen 400mg Liquid Gels',
    category: 'Analgesics',
    batchNo: 'IBU-7721-F',
    quantity: 500,
    unitPrice: 9.80,
    expiryDate: new Date(Date.now() + 52 * dayMs).toISOString(), // Monitor (52 days)
    supplier: 'MediSupply Co.',
    location: 'Bay A2 - Rack 2',
    status: 'In Stock',
  },
  {
    id: '10',
    name: 'Surgical Face Masks 50s',
    category: 'PPE',
    batchNo: 'MSK-1102-M',
    quantity: 1200,
    unitPrice: 6.50,
    expiryDate: new Date(Date.now() - 14 * dayMs).toISOString(), // Expired (-14 days)
    supplier: 'Global Health Ltd.',
    location: 'Warehouse Box W4',
    status: 'Quarantined',
  }
];
