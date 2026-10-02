import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ImagePlus, Pill } from 'lucide-react';
import { useInventory } from '../api/useInventory';
import { formatGhc } from '../utils/currency';
import { useAuth } from '../api/useAuth';

function getRisk(expiryDate: string, nowTimestamp: number): { label: string; badgeClass: string } {
  const exp = new Date(expiryDate).getTime();
  const diffDays = Math.floor((exp - nowTimestamp) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Expired', badgeClass: 'risk-badge--expired' };
  if (diffDays <= 7) return { label: 'Critical', badgeClass: 'risk-badge--critical' };
  if (diffDays <= 30) return { label: 'Action Required', badgeClass: 'risk-badge--action' };
  if (diffDays <= 60) return { label: 'Monitor', badgeClass: 'risk-badge--monitor' };
  return { label: 'Safe', badgeClass: 'risk-badge--safe' };
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, deleteItem, updateItem } = useInventory();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [photoError, setPhotoError] = useState('');
  const nowTimestamp = Date.now();

  const item = items.find(i => i.id === id);

  if (!item) {
    return (
      <div className="page-body">
        <div className="card-container form-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Item Not Found
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            The requested inventory item could not be located in the system database.
          </p>
          <button className="btn-primary" onClick={() => navigate('/inventory')}>
            Return to Inventory Catalog
          </button>
        </div>
      </div>
    );
  }

  const risk = getRisk(item.expiryDate, nowTimestamp);
  const diffDays = Math.floor((new Date(item.expiryDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24));
  const totalValueAtRisk = diffDays <= 30 ? (item.quantity * item.unitPrice) : 0;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      deleteItem(item.id);
      navigate('/inventory');
    }
  };

  const handlePhotoUpload = (file?: File) => {
    if (!file) return;
    setPhotoError('');
    if (!file.type.startsWith('image/')) {
      setPhotoError('Choose an image file to attach a product photo.');
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxEdge = 1200;
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        setPhotoError('This image could not be processed. Try another photo.');
        URL.revokeObjectURL(imageUrl);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      updateItem(item.id, { photoUrl: canvas.toDataURL('image/jpeg', 0.82) });
      URL.revokeObjectURL(imageUrl);
    };
    image.onerror = () => {
      setPhotoError('This image could not be opened. Try another photo.');
      URL.revokeObjectURL(imageUrl);
    };
    image.src = imageUrl;
  };

  return (
    <div className="page-body">
      <div className="card-container form-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem' }}>
          <div className="detail-product-heading">
            <div className="detail-product-photo">
              {item.photoUrl ? <img src={item.photoUrl} alt={`${item.name} product`} /> : <Pill size={30} strokeWidth={1.7} aria-hidden="true" />}
              <label className="detail-photo-upload" title={item.photoUrl ? 'Change product photo' : 'Upload product photo'}>
                <ImagePlus size={15} />
                <span>{item.photoUrl ? 'Change photo' : 'Add photo'}</span>
                <input type="file" accept="image/*" onChange={event => handlePhotoUpload(event.target.files?.[0])} aria-label="Upload product photo" />
              </label>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Batch &amp; Product Details
              </span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {item.name}
              </h1>
              <p className="detail-product-category">{item.category}</p>
              {photoError && <p className="detail-photo-error" role="alert">{photoError}</p>}
            </div>
          </div>
          <span className={`risk-badge ${risk.badgeClass}`}>
            <span className="risk-badge-dot" />
            {risk.label}
          </span>
        </div>

        <div className="table-responsive" style={{ marginBottom: '2rem' }}>
          <table className="modern-table">
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)', width: '35%' }}>Batch / Lot Number</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.batchNo}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Category</td>
                <td style={{ fontWeight: 600 }}>{item.category}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Quantity in Stock</td>
                <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.quantity} units</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{isAdmin ? 'Unit Cost (GH₵)' : 'Selling Price (GH₵)'}</td>
                <td style={{ fontWeight: 600 }}>{formatGhc(item.unitPrice)}</td>
              </tr>
              {isAdmin && <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Stock Value at Risk (GH₵)</td>
                <td style={{ fontWeight: 700, color: totalValueAtRisk > 0 ? '#7C3AED' : 'var(--text-muted)' }}>
                  {totalValueAtRisk > 0 ? formatGhc(totalValueAtRisk) : `${formatGhc(0)} (Safe)`}
                </td>
              </tr>}
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Expiry Date</td>
                <td>{new Date(item.expiryDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Time to Expiry</td>
                <td style={{ fontWeight: 700, color: diffDays < 0 ? '#DC2626' : (diffDays <= 7 ? '#EF4444' : 'var(--text-main)') }}>
                  {diffDays < 0 ? `Expired ${Math.abs(diffDays)} days ago` : `${diffDays} days remaining`}
                </td>
              </tr>
              {isAdmin && <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Supplier / Vendor</td>
                <td>{item.supplier}</td>
              </tr>}
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Warehouse Location</td>
                <td>
                  <span style={{ background: 'var(--bg-canvas)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                    {item.location}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Stock Status</td>
                <td>
                  <span style={{ fontWeight: 600, color: item.status === 'Quarantined' ? '#DC2626' : 'var(--color-primary)' }}>
                    {item.status}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>System Identifier</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>{item.id}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => navigate('/inventory')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Catalog
          </button>
          {isAdmin && <button className="btn-danger" onClick={handleDelete}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete Item
          </button>}
        </div>
      </div>
    </div>
  );
}
