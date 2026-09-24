import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../api/useInventory';

export default function AddItem() {
  const navigate = useNavigate();
  const { addItem } = useInventory();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(50);
  const [unitPrice, setUnitPrice] = useState<number | ''>(12.50);
  const [expiryDate, setExpiryDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'In Stock' | 'Low Stock' | 'Quarantined' | 'Pending Return'>('In Stock');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !category || !expiryDate || quantity === '' || unitPrice === '') return;

    addItem({
      name,
      category,
      batchNo: batchNo || `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      expiryDate,
      supplier: supplier || 'General Supplier',
      location: location || 'Main Warehouse',
      status,
    });

    navigate('/inventory');
  };

  return (
    <div className="page-body">
      <div className="card-container form-card">
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            Add Inventory Item
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Enter product details, batch numbers, supplier info, and warehouse location for real-time risk tracking.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="name" className="form-label">Product Name</label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Amoxicillin 500mg, Paracetamol"
                value={name}
                onChange={e => setName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category" className="form-label">Category</label>
              <input
                id="category"
                type="text"
                placeholder="e.g. Antibiotics, Analgesics"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="batchNo" className="form-label">Batch / Lot Number</label>
              <input
                id="batchNo"
                type="text"
                placeholder="e.g. AMX-2026-08"
                value={batchNo}
                onChange={e => setBatchNo(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="quantity" className="form-label">Stock Quantity (Units)</label>
              <input
                id="quantity"
                type="number"
                min="0"
                placeholder="e.g. 100"
                value={quantity}
                onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="unitPrice" className="form-label">Unit Price ($)</label>
              <input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 15.50"
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="expiryDate" className="form-label">Expiry Date</label>
              <input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="status" className="form-label">Stock Status</label>
              <select
                id="status"
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="form-input"
              >
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Quarantined">Quarantined</option>
                <option value="Pending Return">Pending Return</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="supplier" className="form-label">Supplier / Distributor</label>
              <input
                id="supplier"
                type="text"
                placeholder="e.g. PharmaCorp Inc."
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="location" className="form-label">Warehouse Location</label>
              <input
                id="location"
                type="text"
                placeholder="e.g. Aisle A1 - Shelf 2"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/inventory')}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
