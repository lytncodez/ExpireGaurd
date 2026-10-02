import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../api/useInventory';
import CurrencyInput from '../components/CurrencyInput';
import { useAuth } from '../api/useAuth';

type EntryPath = 'choice' | 'scan' | 'manual' | 'import';

export default function AddItem() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { addItem } = useInventory();

  // Active path state
  const [activePath, setActivePath] = useState<EntryPath>('choice');

  // Manual & Scan Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(100);
  const [unitPrice, setUnitPrice] = useState<number | ''>(18.50);
  const [mfgDate, setMfgDate] = useState('2024-01-15');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'In Stock' | 'Low Stock' | 'Quarantined' | 'Pending Return'>('In Stock');

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanDetected, setScanDetected] = useState(false);
  const [scanResultFeedback, setScanResultFeedback] = useState<string | null>(null);

  // CSV Import State
  const [dragActive, setDragActive] = useState(false);
  const [importStep, setImportStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importRowCount, setImportRowCount] = useState<number>(0);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form Submission
  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !category || !expiryDate || quantity === '' || unitPrice === '') return;

    addItem({
      name,
      category,
      batchNo: batchNo || `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: Number(quantity),
      unitPrice: isAdmin ? Number(unitPrice) : 0,
      unitCostGhs: isAdmin ? Number(unitPrice) : undefined,
      sellingPriceGhs: isAdmin ? undefined : Number(unitPrice),
      expiryDate,
      ...(isAdmin ? { supplier: supplier || 'PharmaCorp Direct' } : {}),
      location: location || 'Aisle A1 - Shelf 1',
      status,
    });

    navigate('/inventory');
  };

  // Sample barcode scanner triggers (simulating real GS1/DataMatrix pharma codes)
  const handleSimulateScan = (preset: 'amox' | 'art' | 'para') => {
    setIsScanning(true);
    setScanDetected(false);
    setScanResultFeedback('Acquiring camera feed & reading GS1-128 DataMatrix...');

    setTimeout(() => {
      setIsScanning(false);
      setScanDetected(true);

      if (preset === 'amox') {
        setName('Amoxicillin Clavulanate 625mg');
        setCategory('Antibiotics');
        setBatchNo('GS1-AC625-9921');
        setQuantity(240);
        setUnitPrice(32.00);
        setMfgDate('2024-02-10');
        // Expiring in ~25 days (Action Required)
        const exp = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setExpiryDate(exp);
        setSupplier('Aurobindo Pharma');
        setLocation('Aisle B2 - Shelf 4');
        setScanResultFeedback('Barcode decoded: (01)00345678901285(17)261025(10)GS1-AC625-9921');
      } else if (preset === 'art') {
        setName('Artemether / Lumefantrine 20/120mg (Coartem)');
        setCategory('Antimalarials');
        setBatchNo('ACT-5541-GH');
        setQuantity(500);
        setUnitPrice(22.50);
        setMfgDate('2024-03-01');
        // Expiring in 6 days (Critical)
        const exp = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setExpiryDate(exp);
        setSupplier('Novartis Ghana Ltd.');
        setLocation('Aisle A1 - Fast Track Bay');
        setScanResultFeedback('Barcode decoded: (01)05012345678901(17)260930(10)ACT-5541-GH');
      } else {
        setName('Paracetamol Extra 500mg/65mg');
        setCategory('Analgesics');
        setBatchNo('PAR-3312-EX');
        setQuantity(850);
        setUnitPrice(7.50);
        setMfgDate('2024-04-12');
        // Expiring in 180 days (Safe)
        const exp = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setExpiryDate(exp);
        setSupplier('Ernest Chemists Ltd.');
        setLocation('Warehouse Bay W1');
        setScanResultFeedback('Barcode decoded: (01)06180000012345(17)270325(10)PAR-3312-EX');
      }
    }, 1200);
  };

  // CSV Drag and Drop Simulation
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startCsvImportSimulation(e.dataTransfer.files[0].name);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startCsvImportSimulation(e.target.files[0].name);
    }
  };

  const startCsvImportSimulation = (filename: string) => {
    setImportFileName(filename);
    setImportStep(1);
    setImportSuccess(false);

    // Step 1: Validating schema
    setTimeout(() => {
      setImportStep(2);
      // Step 2: Checking batch duplicates
      setTimeout(() => {
        setImportStep(3);
        // Step 3: Calculating risk bands
        setTimeout(() => {
          setImportStep(4);
          setImportRowCount(6);
          setImportSuccess(true);
        }, 600);
      }, 700);
    }, 600);
  };

  const commitCsvImport = () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const batchList = [
      { name: 'Ciprofloxacin 500mg', category: 'Antibiotics', batchNo: 'CIP-4401', quantity: 300, unitPrice: 28.00, expiryDate: new Date(Date.now() + 14 * dayMs).toISOString(), supplier: 'Kinapharma Ltd.', location: 'Aisle B1' },
      { name: 'Azithromycin 500mg 3s', category: 'Antibiotics', batchNo: 'AZI-2210', quantity: 180, unitPrice: 38.50, expiryDate: new Date(Date.now() + 45 * dayMs).toISOString(), supplier: 'Tobbinco Pharmaceuticals', location: 'Aisle B3' },
      { name: 'Diclofenac Sodium 50mg', category: 'Analgesics', batchNo: 'DIC-9908', quantity: 450, unitPrice: 12.00, expiryDate: new Date(Date.now() + 85 * dayMs).toISOString(), supplier: 'Ernest Chemists Ltd.', location: 'Aisle A2' },
      { name: 'Oral Rehydration Salts (ORS) 10s', category: 'First Aid', batchNo: 'ORS-6612', quantity: 600, unitPrice: 5.50, expiryDate: new Date(Date.now() + 210 * dayMs).toISOString(), supplier: 'Universal Hospitals Group', location: 'Aisle C1' },
      { name: 'Lisinopril 10mg Tablets', category: 'Cardiovascular', batchNo: 'LIS-8841', quantity: 220, unitPrice: 42.00, expiryDate: new Date(Date.now() + 4 * dayMs).toISOString(), supplier: 'PharmaCorp Inc.', location: 'Cold Storage C1' },
      { name: 'Cetirizine 10mg Tablets', category: 'Antihistamines', batchNo: 'CET-1123', quantity: 350, unitPrice: 8.50, expiryDate: new Date(Date.now() - 2 * dayMs).toISOString(), supplier: 'MediSupply Co.', location: 'Quarantine Bay Q1' },
    ];

    batchList.forEach(b => {
      addItem({
        ...b,
        unitPrice: isAdmin ? b.unitPrice : 0,
        unitCostGhs: isAdmin ? b.unitPrice : undefined,
        sellingPriceGhs: isAdmin ? undefined : b.unitPrice,
        supplier: isAdmin ? b.supplier : undefined,
        status: b.quantity < 200 ? 'Low Stock' : 'In Stock',
      });
    });

    navigate('/inventory');
  };

  return (
    <div className="page-body">
      {/* Top Breadcrumb & Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E3A4C', marginBottom: '0.25rem' }}>
            Add &amp; Ingest Inventory
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748B' }}>
            Choose an ingestion method to register new stock, parse barcodes, or bulk upload batch manifests.
          </p>
        </div>

        {activePath !== 'choice' && (
          <button
            type="button"
            onClick={() => setActivePath('choice')}
            className="btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Choose Other Method
          </button>
        )}
      </div>

      {/* ─── ENTRY CHOICE SCREEN ─────────────────────────────────────────────────── */}
      {activePath === 'choice' && (
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ background: '#EEF2FF', color: '#3B3593', fontWeight: 800, fontSize: '0.76rem', padding: '0.3rem 0.8rem', borderRadius: '999px', letterSpacing: '0.04em' }}>
              THREE FLEXIBLE INGESTION PATHWAYS
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E3A4C', marginTop: '0.6rem', marginBottom: '0.4rem' }}>
              How would you like to add stock today?
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
              Select an option below. Manual entry is always ready as an immediate fallback.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* Option 1: Scan QR/Barcode */}
            <div
              onClick={() => setActivePath('scan')}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '2px solid #E2E8F0',
                padding: '1.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#3B3593';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(59,53,147,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
              }}
            >
              <div>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', color: '#3B3593', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <rect x="7" y="7" width="10" height="10" rx="1" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E3A4C', marginBottom: '0.4rem' }}>
                  Scan QR / Barcode
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Point your device camera at a 2D DataMatrix or 1D barcode. Auto-populates batch, expiry, and product fields instantly.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3B3593', fontWeight: 700, fontSize: '0.88rem' }}>
                Launch Scanner
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Option 2: Enter Manually */}
            <div
              onClick={() => setActivePath('manual')}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '2px solid #E2E8F0',
                padding: '1.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#1E3A4C';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(30,58,76,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
              }}
            >
              <div>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E3A4C', marginBottom: '0.4rem' }}>
                  Enter Manually
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Complete form with full control over batch numbers, manufacturing dates, expiry dates, supplier details, and dispensary bay locations.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284C7', fontWeight: 700, fontSize: '0.88rem' }}>
                Open Manual Form
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Option 3: Import CSV/Excel */}
            <div
              onClick={() => setActivePath('import')}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '2px solid #E2E8F0',
                padding: '1.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#10B981';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(16,185,129,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
              }}
            >
              <div>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E3A4C', marginBottom: '0.4rem' }}>
                  Import CSV / Excel
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Drag &amp; drop your supplier stock sheets. Includes schema verification, batch duplicate checking, and automated FEFO ranking.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontWeight: 700, fontSize: '0.88rem' }}>
                Upload Stock Manifest
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>

          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span style={{ fontSize: '0.84rem', color: '#475569' }}>
              <strong>Tip:</strong> If you don't have barcode hardware or a camera, manual entry is always accessible as a complete, zero-friction fallback.
            </span>
          </div>
        </div>
      )}

      {/* ─── PATH 1: SCAN QR / BARCODE ───────────────────────────────────────────── */}
      {activePath === 'scan' && (
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div className="card-container" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E3A4C' }}>
                  Camera Barcode &amp; QR Scanner
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  Align the medicine packaging barcode within the viewfinder to read GS1 DataMatrix identifiers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePath('manual')}
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
              >
                Switch to Manual Entry
              </button>
            </div>

            {/* Viewfinder Camera Simulation */}
            <div style={{
              background: '#0F172A',
              borderRadius: '14px',
              height: '280px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '1.25rem',
            }}>
              {/* Reticle */}
              <div style={{
                width: '220px',
                height: '140px',
                border: '2px dashed rgba(56, 189, 248, 0.8)',
                borderRadius: '12px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isScanning ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
              }}>
                {isScanning && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: '#38BDF8',
                    boxShadow: '0 0 8px #38BDF8',
                    animation: 'pulse 1.2s infinite',
                  }} />
                )}
                <span style={{ color: '#94A3B8', fontSize: '0.78rem', textAlign: 'center', padding: '0 0.5rem' }}>
                  {isScanning ? 'Decoding barcode stream...' : (scanDetected ? '✓ GS1 Barcode Recognized!' : 'Align 1D or 2D barcode here')}
                </span>
              </div>

              {scanResultFeedback && (
                <div style={{ position: 'absolute', bottom: '12px', background: 'rgba(15, 23, 42, 0.85)', padding: '0.4rem 0.9rem', borderRadius: '6px', color: '#38BDF8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {scanResultFeedback}
                </div>
              )}
            </div>

            {/* Quick-Scan Simulation Presets for Testing */}
            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E3A4C', marginBottom: '0.6rem' }}>
                Test Scanner with Sample Pharmaceutical Codes:
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSimulateScan('amox')}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  💊 Scan Amoxicillin (25d)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateScan('art')}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  ⚡ Scan Coartem (6d Critical)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateScan('para')}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  🛡️ Scan Paracetamol (180d Safe)
                </button>
              </div>
            </div>

            {/* Recognized Fields (Fully Editable Before Saving) */}
            {scanDetected && (
              <form onSubmit={handleManualSubmit}>
                <div style={{ borderTop: '2px solid #E2E8F0', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E3A4C' }}>
                      Recognized Batch Details (Review &amp; Edit)
                    </div>
                    <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '0.74rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                      Ready to Save
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label className="form-label">Product Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">Category</label>
                      <input
                        type="text"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">Batch Number</label>
                      <input
                        type="text"
                        value={batchNo}
                        onChange={e => setBatchNo(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        className="form-input"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">{isAdmin ? 'Unit Cost' : 'Selling Price'}</label>
                      <CurrencyInput value={unitPrice} onChange={setUnitPrice} className="form-input" required />
                    </div>

                    <div>
                      <label className="form-label">Expiry Date</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={e => setExpiryDate(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    {isAdmin && <div>
                      <label className="form-label">Supplier</label>
                      <input
                        type="text"
                        value={supplier}
                        onChange={e => setSupplier(e.target.value)}
                        className="form-input"
                      />
                    </div>}

                    <div>
                      <label className="form-label">Dispensary Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setScanDetected(false)}
                      className="btn-secondary"
                      style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
                    >
                      Rescan
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ padding: '0.6rem 1.5rem', fontSize: '0.88rem', background: '#3B3593' }}
                    >
                      Confirm &amp; Add to Inventory
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── PATH 2: ENTER MANUALLY ─────────────────────────────────────────────── */}
      {activePath === 'manual' && (
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div className="card-container" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E3A4C', marginBottom: '0.25rem' }}>
                Manual Inventory Entry Form
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                Complete all required fields below to create a new pharmaceutical batch record.
              </p>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="m-name" className="form-label">Product Name *</label>
                  <input
                    id="m-name"
                    type="text"
                    placeholder="e.g. Artemether-Lumefantrine 20/120mg"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="m-cat" className="form-label">Category *</label>
                  <input
                    id="m-cat"
                    type="text"
                    placeholder="e.g. Antimalarials, Antibiotics"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="m-batch" className="form-label">Batch / Lot Number *</label>
                  <input
                    id="m-batch"
                    type="text"
                    placeholder="e.g. BATCH-2026-99"
                    value={batchNo}
                    onChange={e => setBatchNo(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="m-qty" className="form-label">Quantity in Stock (Units) *</label>
                  <input
                    id="m-qty"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="m-price" className="form-label">{isAdmin ? 'Unit Cost *' : 'Selling Price *'}</label>
                  <CurrencyInput id="m-price" value={unitPrice} onChange={setUnitPrice} className="form-input" placeholder="18.50" min={0} required />
                </div>

                <div>
                  <label htmlFor="m-mfg" className="form-label">Manufacturing Date</label>
                  <input
                    id="m-mfg"
                    type="date"
                    value={mfgDate}
                    onChange={e => setMfgDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div>
                  <label htmlFor="m-exp" className="form-label">Expiry Date *</label>
                  <input
                    id="m-exp"
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                {isAdmin && <div>
                  <label htmlFor="m-sup" className="form-label">Supplier / Distributor</label>
                  <input
                    id="m-sup"
                    type="text"
                    placeholder="e.g. Ernest Chemists Ltd."
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className="form-input"
                  />
                </div>}

                <div>
                  <label htmlFor="m-loc" className="form-label">Dispensary Storage Location</label>
                  <input
                    id="m-loc"
                    type="text"
                    placeholder="e.g. Aisle A2 - Shelf 3"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div>
                  <label htmlFor="m-status" className="form-label">Initial Stock Status</label>
                  <select
                    id="m-status"
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="In Stock">In Stock (Active Dispensing)</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Quarantined">Quarantined (Hold for Inspection)</option>
                    <option value="Pending Return">Pending Return</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setActivePath('choice')}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.88rem', background: '#3B3593' }}
                >
                  Save Item to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PATH 3: IMPORT CSV / EXCEL ─────────────────────────────────────────── */}
      {activePath === 'import' && (
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div className="card-container" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E3A4C' }}>
                  Bulk Batch Import (CSV / Excel)
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  Upload manufacturer manifests or ERP export files to ingest stock at scale.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePath('manual')}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                Use Manual Form Instead
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
            />

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? '#3B3593' : '#CBD5E1'}`,
                borderRadius: '14px',
                background: dragActive ? '#EEF2FF' : '#F8FAFC',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#EEF2FF', color: '#3B3593', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E3A4C', marginBottom: '0.35rem' }}>
                {importFileName ? `Selected: ${importFileName}` : 'Drag & drop your CSV or Excel file here'}
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: '0.75rem' }}>
                or click to browse your computer (.csv, .xlsx up to 10MB)
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#3B3593', fontSize: '0.82rem', fontWeight: 600 }}>
                <span>Download Sample Template (.CSV)</span>
              </div>
            </div>

            {/* File Requirements Checklist */}
            <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E3A4C', marginBottom: '0.5rem' }}>
                File Requirements Checklist:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', fontSize: '0.78rem', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 800 }}>✓</span> Required: Product Name, Batch Number
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 800 }}>✓</span> Required: Expiry Date (YYYY-MM-DD or DD/MM/YYYY)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 800 }}>✓</span> Required: Quantity in Stock (integer)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 800 }}>✓</span> Optional: Unit Price, Supplier, Location
                </div>
              </div>
            </div>

            {/* Import Progress Steps with Checkmarks */}
            {importStep > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E3A4C', marginBottom: '1rem' }}>
                  Import Validation Progress:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Step 1 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: importStep >= 1 ? '#DCFCE7' : '#F1F5F9', color: importStep >= 1 ? '#15803D' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                        {importStep > 1 ? '✓' : '1'}
                      </span>
                      <span style={{ color: importStep >= 1 ? '#1E3A4C' : '#94A3B8', fontWeight: 600 }}>
                        Validating CSV schema &amp; column headers
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: importStep > 1 ? '#15803D' : '#3B3593', fontWeight: 700 }}>
                      {importStep > 1 ? 'Passed' : 'Checking...'}
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: importStep >= 2 ? '#DCFCE7' : '#F1F5F9', color: importStep >= 2 ? '#15803D' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                        {importStep > 2 ? '✓' : '2'}
                      </span>
                      <span style={{ color: importStep >= 2 ? '#1E3A4C' : '#94A3B8', fontWeight: 600 }}>
                        Checking for duplicate batch numbers
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: importStep > 2 ? '#15803D' : (importStep === 2 ? '#3B3593' : '#94A3B8'), fontWeight: 700 }}>
                      {importStep > 2 ? '0 Collisions' : (importStep === 2 ? 'Scanning...' : 'Pending')}
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: importStep >= 3 ? '#DCFCE7' : '#F1F5F9', color: importStep >= 3 ? '#15803D' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                        {importStep > 3 ? '✓' : '3'}
                      </span>
                      <span style={{ color: importStep >= 3 ? '#1E3A4C' : '#94A3B8', fontWeight: 600 }}>
                        Classifying FEFO risk bands (Safe, Monitor, Action, Critical)
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: importStep > 3 ? '#15803D' : (importStep === 3 ? '#3B3593' : '#94A3B8'), fontWeight: 700 }}>
                      {importStep > 3 ? 'Complete' : (importStep === 3 ? 'Computing...' : 'Pending')}
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: importStep >= 4 ? '#DCFCE7' : '#F1F5F9', color: importStep >= 4 ? '#15803D' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                        {importStep >= 4 ? '✓' : '4'}
                      </span>
                      <span style={{ color: importStep >= 4 ? '#1E3A4C' : '#94A3B8', fontWeight: 600 }}>
                        Ready for database commit
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: importStep >= 4 ? '#15803D' : '#94A3B8', fontWeight: 700 }}>
                      {importStep >= 4 ? `${importRowCount} Batches Parsed` : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Success Confirmation & Commit */}
            {importSuccess && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#065F46' }}>
                      Ready to Ingest {importRowCount} Validated Pharmaceutical Batches
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#047857' }}>
                      All items passed regulatory and expiration integrity checks.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={commitCsvImport}
                  className="btn-primary"
                  style={{ background: '#059669', padding: '0.65rem 1.4rem', fontSize: '0.88rem' }}
                >
                  Commit &amp; Add to Inventory
                </button>
              </div>
            )}

            {/* Fallback button if import steps have not started */}
            {importStep === 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => startCsvImportSimulation('hospital_stock_manifest_q4.csv')}
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                >
                  🧪 Test Upload with Demo CSV
                </button>

                <button
                  type="button"
                  onClick={() => setActivePath('manual')}
                  className="btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', background: '#1E3A4C' }}
                >
                  Manual Entry Fallback
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
