import { useState, useEffect } from 'react';
import { 
  ComposedChart, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Droplet, Moon, Activity } from 'lucide-react';

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || '') + '/api/logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data); // Assuming chronological descending from backend
        setLoading(false);
      })
      .catch(err => console.error("Error fetching logs:", err));
  }, []);

  if (loading) {
    return <div className="animate-fade-in">Loading dashboard data...</div>;
  }

  const latestLog = logs[0] || {};

  // Process data for charts (needs chronological ascending)
  const chartData = [...logs].reverse().map(log => {
    let cramp = 0, bloating = 0, pressure = 0, pain = 0, itch = 0;
    
    if (log.symptoms) {
      log.symptoms.forEach(s => {
        const name = s.symptom_name.toLowerCase();
        if (name.includes('cramp')) cramp = Math.max(cramp, s.severity);
        if (name.includes('bloating')) bloating = Math.max(bloating, s.severity);
        if (name.includes('pressure')) pressure = Math.max(pressure, s.severity);
        if (name.includes('pain') && !name.includes('pressure')) pain = Math.max(pain, s.severity);
        if (name.includes('itch')) itch = Math.max(itch, s.severity);
      });
    }

    return {
      log_date: log.log_date.substring(5), // Shorten date e.g. "07-04"
      water: log.water_count != null ? log.water_count : null,
      sleep: log.total_sleep_hours != null ? log.total_sleep_hours : null,
      wakeups: log.sleep_wakeups != null ? log.sleep_wakeups : null,
      bm_count: log.bowel_movement_count != null ? log.bowel_movement_count : null,
      cramp, bloating, pressure, pain, itch
    };
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Health Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Overview of your daily metrics and symptom tracking.</p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-3" style={{ marginBottom: '32px' }}>
        <div className="glass-panel delay-100" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Droplet color="var(--secondary)" size={24} />
            <h3 style={{ margin: 0 }}>Latest Water Intake</h3>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {latestLog.water_count || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>glasses</span>
          </div>
        </div>
        
        <div className="glass-panel delay-100" style={{ borderLeft: '4px solid #a29bfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Moon color="#a29bfe" size={24} />
            <h3 style={{ margin: 0 }}>Latest Sleep</h3>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {latestLog.total_sleep_hours || '--'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>hrs</span>
          </div>
        </div>

        <div className="glass-panel delay-100" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Activity color="var(--primary)" size={24} />
            <h3 style={{ margin: 0 }}>Current Cycle Day</h3>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Day {latestLog.cycle_day || '--'}
          </div>
        </div>
      </div>

      {/* Core Health Trends */}
      <div className="grid grid-cols-2" style={{ marginBottom: '32px' }}>
        <div className="glass-panel delay-200">
          <h2>Sleep & Water Trends</h2>
          <div style={{ height: '300px', width: '100%', marginTop: '24px' }}>
            <ResponsiveContainer>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="log_date" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
                <Legend />
                <Bar dataKey="water" barSize={20} fill="var(--secondary)" name="Water (glasses)" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="sleep" stroke="#a29bfe" strokeWidth={3} name="Sleep (hrs)" dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={true} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel delay-200">
          <h2>Bowel Movements (Count)</h2>
          <div style={{ height: '300px', width: '100%', marginTop: '24px' }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="log_date" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
                <Legend />
                <Bar dataKey="bm_count" fill="var(--primary)" name="BM Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Symptom Severity Trends Section */}
      <div className="glass-panel delay-200" style={{ marginBottom: '32px' }}>
        <h2>Symptom Severity (0-5) Over Time</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Track the peak severity of each symptom across your cycle.</p>
        
        <div style={{ height: '400px', width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="log_date" stroke="var(--text-muted)" />
              <YAxis domain={[0, 5]} stroke="var(--text-muted)" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
              <Legend verticalAlign="top" height={36}/>
              
              <Line type="monotone" dataKey="cramp" stroke="#ff7675" strokeWidth={3} name="Cramp" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="bloating" stroke="#fdcb6e" strokeWidth={3} name="Bloating" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="pressure" stroke="#74b9ff" strokeWidth={3} name="Abd Pressure" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="pain" stroke="#e84393" strokeWidth={3} name="Pain" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="itch" stroke="#00b894" strokeWidth={3} name="Itch" dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
