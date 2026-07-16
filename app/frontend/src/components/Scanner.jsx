import { useState } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Scanner({ onScanComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    
    setScanning(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/scan', {
        method: 'POST',
        body: formData,
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`Server connection failed (${res.status} ${res.statusText}). Please make sure the backend is running and try again.`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || `Scan failed with status ${res.status}`);
      }
      
      if (onScanComplete) {
        onScanComplete(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1>Smart Scan</h1>
        <p style={{ color: 'var(--text-muted)' }}>Upload a photo of your whiteboard to automatically extract data.</p>
      </div>

      <div className="grid grid-cols-2">
        <div className="glass-panel delay-100">
          <h2>1. Upload Image</h2>
          
          <div 
            style={{ 
              border: '2px dashed var(--border)', 
              borderRadius: 'var(--radius)', 
              padding: '40px 20px',
              textAlign: 'center',
              marginTop: '16px',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
              }}
            />
            
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px' }} />
            ) : (
              <div>
                <Upload size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
                <h3 style={{ color: 'var(--text-main)' }}>Tap to upload whiteboard</h3>
              </div>
            )}
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '24px' }}
            disabled={!file || scanning}
            onClick={handleScan}
          >
            {scanning ? 'Scanning via AI...' : <><Camera size={18} /> Scan Now</>}
          </button>

          {error && (
            <div style={{ marginTop: '16px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
