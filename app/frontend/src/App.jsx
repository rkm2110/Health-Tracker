import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Insights from './components/Insights';
import ManualEntry from './components/ManualEntry';
import RawData from './components/RawData';
import { Edit3, Activity, LineChart, Sparkles, Database } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editDate, setEditDate] = useState(null);

  const handleEdit = (date) => {
    setEditDate(date);
    setActiveTab('manual');
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity color="var(--primary)" size={28} />
            <h2>Tikli Health Tracker</h2>
          </div>
          <div className="nav-links">
            <button 
              className={`btn nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LineChart size={18} /> Dashboard
            </button>
            <button 
              className={`btn nav-link ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => { setEditDate(null); setActiveTab('manual'); }}
            >
              <Edit3 size={18} /> Data Entry
            </button>
            <button 
              className={`btn nav-link ${activeTab === 'raw' ? 'active' : ''}`}
              onClick={() => setActiveTab('raw')}
            >
              <Database size={18} /> History
            </button>
            <button 
              className={`btn nav-link ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              <Sparkles size={18} /> Insights
            </button>
          </div>
        </div>
      </nav>

      <main className="app-container">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'manual' && <ManualEntry editDate={editDate} />}
        {activeTab === 'raw' && <RawData onEdit={handleEdit} />}
        {activeTab === 'insights' && <Insights />}
      </main>
    </>
  );
}

export default App;
