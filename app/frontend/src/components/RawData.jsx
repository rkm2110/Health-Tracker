import { useState, useEffect } from 'react';
import { Database, Search } from 'lucide-react';

export default function RawData({ onEdit }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/logs');
      const data = await res.json();
      
      const computeSleep = (start, end) => {
        if (!start || !end) return null;
        try {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          let mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60;
          return (mins / 60).toFixed(1);
        } catch(e) { return null; }
      };

      const formatted = data.map(log => ({
        ...log,
        total_sleep_hours: log.total_sleep_hours || computeSleep(log.sleep_time, log.wake_up_time)
      }));

      setLogs(formatted);
    } catch (err) {
      console.error("Failed to load raw data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDelete = async (date) => {
    if (window.confirm(`Are you sure you want to delete all data for ${date}? This cannot be undone.`)) {
      try {
        const res = await fetch((import.meta.env.VITE_API_URL || "") + `/api/logs/${date}`, { method: 'DELETE' });
        if (res.ok) {
          fetchLogs();
        } else {
          const data = await res.json();
          alert(`Failed to delete: ${data.error}`);
        }
      } catch (err) {
        alert(`Error deleting data: ${err.message}`);
      }
    }
  };

  const handleEdit = (date) => {
    if (window.confirm(`Do you want to edit the data for ${date}?`)) {
      if (onEdit) onEdit(date);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database color="var(--primary)" size={28} />
          <h1 style={{ margin: 0 }}>Raw Data History</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>Review your complete historical database logs.</p>
      </div>

      <div className="glass-panel">
        {isLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading historical data...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Cycle Day</th>
                  <th style={{ padding: '12px' }}>Water</th>
                  <th style={{ padding: '12px' }}>Sleep (Hrs)</th>
                  <th style={{ padding: '12px' }}>Bowel Movements</th>
                  <th style={{ padding: '12px' }}>Logged Symptoms</th>
                  <th style={{ padding: '12px' }}>Filled on</th>
                  <th style={{ padding: '12px' }}>Update</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{log.log_date}</td>
                    <td style={{ padding: '12px' }}>{log.cycle_day || '-'}</td>
                    <td style={{ padding: '12px' }}>{log.water_count || '0'}</td>
                    <td style={{ padding: '12px' }}>{log.total_sleep_hours || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      {log.bowel_movements && log.bowel_movements.length > 0
                        ? log.bowel_movements.map((bm, bIdx) => (
                          <div key={bIdx} style={{ padding: '2px 0' }}>
                            • BM {bIdx + 1}: {bm.complete} (Scale: {bm.scale || '-'})
                          </div>
                        ))
                        : (log.bowel_movement_count > 0 ? `${log.bowel_movement_count} recorded` : '0')}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {log.symptoms && log.symptoms.length > 0 
                        ? log.symptoms.map((symp, sIdx) => (
                          <div key={sIdx} style={{ padding: '2px 0' }}>
                            • {symp.symptom_name} ({symp.severity})
                            {symp.notes && <span style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginLeft: '4px' }}>[{symp.notes}]</span>}
                          </div>
                        ))
                        : 'None recorded'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                      {log.updated_at ? new Date(log.updated_at.endsWith('Z') ? log.updated_at : log.updated_at + 'Z').toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <button 
                          className="btn" 
                          style={{ padding: '4px 8px', fontSize: '0.85em' }}
                          onClick={() => handleEdit(log.log_date)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn" 
                          style={{ padding: '4px 8px', fontSize: '0.85em', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => handleDelete(log.log_date)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No data logs found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
