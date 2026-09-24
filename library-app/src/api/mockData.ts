export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  expiryDate: string; // ISO format
}

export const mockItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Paracetamol',
    category: 'Medication',
    quantity: 120,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ahead
  },
  {
    id: '2',
    name: 'Aspirin',
    category: 'Medication',
    quantity: 45,
    expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // expired 5 days ago
  },
  {
    id: '3',
    name: 'Bandage Pack',
    category: 'Supplies',
    quantity: 200,
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ahead (expiring soon)
  },
];
