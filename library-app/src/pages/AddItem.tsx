import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../api/useInventory';

export default function AddItem() {
  const navigate = useNavigate();
  const { addItem } = useInventory();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [expiryDate, setExpiryDate] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !category || !expiryDate || quantity === '') return;
    addItem({ name, category, quantity: Number(quantity), expiryDate });
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
            Enter product details below to track expiration risk and manage stock status.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Item Name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Paracetamol 500mg, Amoxicillin"
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
              placeholder="e.g. Medication, Surgical Supplies, Reagents"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity" className="form-label">Quantity (Units)</label>
            <input
              id="quantity"
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={quantity}
              onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
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

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
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
