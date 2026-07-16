import { useState, useEffect } from 'react';
import { Save, AlertCircle, Plus, X } from 'lucide-react';
import Scanner from './Scanner';

const PainCell = ({ painArr, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState('q1');
  const [s, setS] = useState(0);

  const handleAdd = () => {
    onChange([...painArr, { notes: q, severity: parseInt(s) || 0 }]);
    setIsOpen(false);
    setS(0);
    setQ('q1');
  };

  const handleRemove = (idx) => {
    onChange(painArr.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', position: 'relative' }}>
      {painArr.map((p, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
          {p.notes}:{p.severity}
          <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemove(idx)} />
        </div>
      ))}
      <button type="button" onClick={() => setIsOpen(!isOpen)} style={{ background: 'none', border: '1px dashed var(--border)', cursor: 'pointer', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', color: 'var(--text-main)' }}>
        + Add
      </button>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '8px', borderRadius: '8px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <select value={q} onChange={e => setQ(e.target.value)} style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-main)' }}>
              {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={`q${n}`}>q{n}</option>)}
            </select>
            <input type="number" min="0" max="5" value={s} onChange={e => setS(e.target.value)} style={{ padding: '4px', width: '40px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-main)' }} />
          </div>
          <button type="button" onClick={handleAdd} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }}>Add</button>
        </div>
      )}
    </div>
  );
};
export default function ManualEntry({ editDate }) {
  const [formData, setFormData] = useState({
    log_date: new Date().toISOString().split('T')[0],
    cycle_day: '',
    water_count: '',
    sleep_time: '',
    wake_up_time: '',
    sleep_wakeups: '',
    total_sleep_hours: '',
    bowel_movement_count: '',
    bowel_movements: []
  });

  const initialPhases = [
    'Wakeup / Morning Prep', 
    'Breakfast', 
    'Post-Breakfast', 
    'Lunch', 
    'Post-Lunch', 
    'Snack', 
    'Dinner', 
    'Post-Dinner', 
    'Bedtime',
    'Overnight'
  ];

  const [gridRows, setGridRows] = useState(
    initialPhases.map((phase, idx) => ({
      id: idx,
      phase,
      time: '',
      meal: '',
      supplements: '',
      exercise: '',
      cramp: '',
      bloating: '',
      pressure: '',
      pain: [],
      itch: ''
    }))
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchDateData = async (date) => {
    if (!date) return;
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || "") + `/api/logs/${date}`);
      const data = await res.json();
      
      if (data.log) {
        setHasExistingData(true);
        let allExercises = [];
        if (data.log.exercise) {
          try {
            allExercises = JSON.parse(data.log.exercise);
          } catch(e) {
            allExercises = [{ timing: 'Wakeup / Morning Prep', exercise_name: data.log.exercise }];
          }
        }

        setFormData(prev => ({
          ...prev,
          log_date: date,
          cycle_day: data.log.cycle_day || '',
          water_count: data.log.water_count || '',
          sleep_time: data.log.sleep_time || '',
          wake_up_time: data.log.wake_up_time || '',
          sleep_wakeups: data.log.sleep_wakeups || '',
          total_sleep_hours: data.log.total_sleep_hours || '',
          bowel_movement_count: data.log.bowel_movement_count || '',
          bowel_movements: data.bowel_movements || []
        }));

        setGridRows(initialPhases.map((phase, idx) => {
          const phaseMeals = data.meals?.filter(m => m.meal_type === phase) || [];
          const phaseSupps = data.supplements?.filter(s => s.timing === phase) || [];
          const phaseSymps = data.symptoms?.filter(s => s.timing === phase) || [];
          
          const getSympSev = (name) => {
            const found = phaseSymps.find(s => s.symptom_name && s.symptom_name.toLowerCase().includes(name.toLowerCase()));
            return found ? found.severity : '';
          };

          const getPainArr = () => {
            return phaseSymps
              .filter(s => s.symptom_name === 'Pain' && (s.severity > 0 || s.notes))
              .map(s => ({ severity: s.severity, notes: s.notes || '' }));
          };

          const getPhaseNote = () => {
            const found = phaseSymps.find(s => s.symptom_name === 'Phase Note');
            return found ? found.notes : '';
          };

          return {
            id: idx,
            phase,
            time: data.phase_times?.find(pt => pt.phase === phase)?.time || '',
            meal: phaseMeals.map(m => m.food_items).join(', ') || '',
            supplements: phaseSupps.map(s => s.supplement_name).join(', ') || '',
            exercise: allExercises.filter(e => e.timing === phase).map(e => e.exercise_name).join(', ') || '',
            cramp: getSympSev('cramp'),
            bloating: getSympSev('bloating'),
            pressure: getSympSev('pressure'),
            pain: getPainArr(),
            itch: getSympSev('itch'),
            notes: getPhaseNote()
          };
        }));
      } else {
        setHasExistingData(false);
        setFormData(prev => ({
          ...prev,
          log_date: date, cycle_day: '', water_count: '', sleep_time: '', wake_up_time: '', 
          sleep_wakeups: '', total_sleep_hours: '', bowel_movement_count: '', 
          bowel_movements: []
        }));
        setGridRows(initialPhases.map((phase, idx) => ({
          id: idx, phase, time: '', meal: '', supplements: '', exercise: '',
          cramp: '', bloating: '', pressure: '', pain: [], itch: '', notes: ''
        })));
      }
    } catch (err) {
      console.error("Error fetching date:", err);
    }
  };

  useEffect(() => {
    if (editDate) {
      fetchDateData(editDate);
    } else {
      fetchDateData(new Date().toISOString().split('T')[0]);
    }
  }, [editDate]);

  const handleDateChange = (e) => {
    fetchDateData(e.target.value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all fields? This will reset the form but will NOT delete data from the database.')) {
      setFormData(prev => ({
        log_date: prev.log_date, cycle_day: '', water_count: '', sleep_time: '', wake_up_time: '', 
        sleep_wakeups: '', total_sleep_hours: '', bowel_movement_count: '', bowel_movements: []
      }));
      setGridRows(initialPhases.map((phase, idx) => ({
        id: idx, phase, time: '', meal: '', supplements: '', exercise: '',
        cramp: '', bloating: '', pressure: '', pain: [], itch: '', notes: ''
      })));
    }
  };

  const handleRowChange = (id, field, value) => {
    setGridRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (hasExistingData) {
      setShowConfirm(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    setError(null);
    
    const calculateSleep = (start, end) => {
      if (!start || !end) return null;
      try {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        return parseFloat((mins / 60).toFixed(1));
      } catch(e) { return null; }
    };

    const meals = [];
    const supplements = [];
    const symptoms = [];
    const exercises = [];
    const phase_times = [];
    
    gridRows.forEach(row => {
      if (row.time) phase_times.push({ phase: row.phase, time: row.time });
      if (row.meal) meals.push({ meal_type: row.phase, food_items: row.meal });
      if (row.supplements) supplements.push({ timing: row.phase, supplement_name: row.supplements });
      if (row.exercise) exercises.push({ timing: row.phase, exercise_name: row.exercise });
      
      const addSymptom = (name, sev, notes = null) => {
        symptoms.push({ timing: row.phase, symptom_name: name, severity: parseInt(sev), notes });
      };

      if (row.cramp) addSymptom('Cramp', row.cramp);
      if (row.bloating) addSymptom('Bloating', row.bloating);
      if (row.pressure) addSymptom('Abdominal Pressure', row.pressure);
      
      if (row.notes) {
        addSymptom('Phase Note', 0, row.notes);
      }
      
      row.pain.forEach(p => {
        symptoms.push({ timing: row.phase, symptom_name: 'Pain', severity: p.severity, notes: p.notes });
      });

      if (row.itch) addSymptom('Itch', row.itch);
    });

    const payload = {
      ...formData,
      cycle_day: parseInt(formData.cycle_day) || null,
      water_count: parseInt(formData.water_count) || 0,
      sleep_wakeups: parseInt(formData.sleep_wakeups) || 0,
      total_sleep_hours: parseFloat(formData.total_sleep_hours) || calculateSleep(formData.sleep_time, formData.wake_up_time),
      bowel_movement_count: parseInt(formData.bowel_movement_count) || 0,
      bowel_movements: formData.bowel_movements || [],
      exercise: JSON.stringify(exercises),
      supporting_therapy: '',
      phase_times,
      meals,
      supplements,
      symptoms
    };

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/logs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      
      alert("Manual Entry Saved Successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScanComplete = async (data) => {
    // Check if the scanned date already exists in the database
    if (data.log_date) {
      try {
        const res = await fetch((import.meta.env.VITE_API_URL || "") + `/api/logs/${data.log_date}`);
        const dbData = await res.json();
        setHasExistingData(!!dbData.log);
      } catch (err) {
        console.error("Failed to check if date exists:", err);
      }
    } else {
      setHasExistingData(false);
    }

    setFormData(prev => {
      let bms = data.bowel_movements || [];
      const count = parseInt(data.bowel_movement_count) || 0;
      if (count > bms.length) {
        for (let i = bms.length; i < count; i++) {
          bms.push({ complete: 'Complete', scale: '' });
        }
      } else if (count < bms.length) {
        bms = bms.slice(0, count);
      }

      return {
        ...prev,
        log_date: data.log_date || prev.log_date,
        cycle_day: data.cycle_day || '',
        water_count: data.water_count || '',
        sleep_time: data.sleep_time || '',
        wake_up_time: data.wake_up_time || '',
        sleep_wakeups: data.sleep_wakeups || '',
        total_sleep_hours: data.total_sleep_hours || '',
        bowel_movement_count: data.bowel_movement_count || '',
        bowel_movements: bms
      };
    });

    setGridRows(prevRows => prevRows.map(row => {
      const phaseMeals = data.meals?.filter(m => m.meal_type === row.phase) || [];
      const phaseSupps = data.supplements?.filter(s => s.timing === row.phase) || [];
      const phaseSymps = data.symptoms?.filter(s => s.timing === row.phase) || [];
      
      const getSympSev = (name) => {
        const found = phaseSymps.find(s => s.symptom_name && s.symptom_name.toLowerCase().includes(name.toLowerCase()));
        return found ? found.severity : '';
      };

      const getPainArr = () => {
        return phaseSymps
          .filter(s => s.symptom_name === 'Pain' && (s.severity > 0 || s.notes))
          .map(s => ({ severity: s.severity, notes: s.notes || '' }));
      };

      const getPhaseNote = () => {
        const found = phaseSymps.find(s => s.symptom_name === 'Phase Note');
        return found ? found.notes : '';
      };

      let allExercises = data.exercises || [];
      if (data.exercise && typeof data.exercise === 'string') {
        allExercises = [{ timing: 'Wakeup / Morning Prep', exercise_name: data.exercise }];
      }
      const exerciseStr = allExercises.filter(e => e.timing === row.phase).map(e => e.exercise_name).join(', ') || '';

      return {
        ...row,
        time: data.phase_times?.find(pt => pt.phase === row.phase)?.time || '',
        meal: phaseMeals.map(m => m.food_items).join(', ') || '',
        supplements: phaseSupps.map(s => s.supplement_name).join(', ') || '',
        exercise: exerciseStr,
        cramp: getSympSev('cramp'),
        bloating: getSympSev('bloating'),
        pressure: getSympSev('pressure'),
        pain: getPainArr(),
        itch: getSympSev('itch'),
        notes: getPhaseNote()
      };
    }));
  };

  const symptomInputStyle = { padding: '8px', textAlign: 'center', width: '45px' };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      
      {/* Custom Confirmation Modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertCircle color="var(--danger)" size={24} />
              <h3 style={{ margin: 0 }}>Confirm Overwrite</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to update the data for <strong>{formData.log_date}</strong>? This will overwrite your previously saved data for this day.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" style={{ background: 'var(--bg-base)', color: 'var(--text-main)' }} onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={executeSave}>
                Save Data
              </button>
            </div>
          </div>
        </div>
      )}

      <Scanner onScanComplete={handleScanComplete} />
      <hr style={{ border: 'none', borderTop: '2px dashed var(--border)', margin: '32px 0' }} />

      <div style={{ marginBottom: '24px' }}>
        <h1>Data Entry Form</h1>
        <p style={{ color: 'var(--text-muted)' }}>Log your day chronologically using the exact whiteboard format. You can manually enter data or let the AI scan fill this out!</p>
      </div>

      <div className="glass-panel delay-100" style={{ marginBottom: '24px' }}>
        <h2>Daily Overview</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Row 1 */}
          <div className="grid grid-cols-3">
            <div className="input-group">
              <label className="input-label">Date</label>
              <input type="date" name="log_date" value={formData.log_date} onChange={handleDateChange} className="input-field" required />
            </div>
            <div className="input-group">
              <label className="input-label">Cycle Day</label>
              <input type="number" min="0" name="cycle_day" value={formData.cycle_day} onChange={handleChange} className="input-field" />
            </div>
            <div className="input-group">
              <label className="input-label"># Glasses of water</label>
              <input type="number" min="0" name="water_count" value={formData.water_count} onChange={handleChange} className="input-field" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="input-group" style={{ background: 'rgba(0,0,0,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <label className="input-label" style={{ marginBottom: '12px', fontSize: '0.95rem', fontWeight: 'bold' }}>Sleep (Last Night)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sleep time</span>
              <input type="time" name="sleep_time" value={formData.sleep_time} onChange={handleChange} className="input-field" style={{ width: 'auto' }} />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input type="time" name="wake_up_time" value={formData.wake_up_time} onChange={handleChange} className="input-field" style={{ width: 'auto' }} />
              <span style={{ color: 'var(--text-muted)', marginLeft: '12px' }}># Wakeups:</span>
              <input type="number" min="0" name="sleep_wakeups" value={formData.sleep_wakeups} onChange={handleChange} className="input-field" style={{ width: '80px' }} />
            </div>
          </div>
        </div>
      </div>


      <div className="glass-panel delay-200">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Chronological Timeline</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px', width: '12%' }}>Phase</th>
                <th style={{ padding: '8px', width: '70px' }}>Time</th>
                <th style={{ padding: '8px', width: '15%' }}>Meals/Ingredients</th>
                <th style={{ padding: '8px', width: '15%' }}>Supplements</th>
                <th style={{ padding: '8px', width: '15%' }}>Exercise/Therapy</th>
                <th colSpan="6" style={{ padding: '12px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>Symptoms & Severity (0-5)</th>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <th colSpan="5"></th>
                <th style={{ padding: '8px', borderLeft: '1px solid var(--border)' }}>Cramp</th>
                <th style={{ padding: '8px' }}>Bloating</th>
                <th style={{ padding: '8px' }}>Abd Pressure</th>
                <th style={{ padding: '8px' }}>Pain</th>
                <th style={{ padding: '8px' }}>Itch</th>
                <th style={{ padding: '8px', borderLeft: '1px solid rgba(0,0,0,0.05)' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {gridRows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                    {row.phase}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="text" placeholder="--" className="input-field" style={{ padding: '8px' }} value={row.time} onChange={(e) => handleRowChange(row.id, 'time', e.target.value)} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="text" className="input-field" style={{ padding: '8px' }} value={row.meal} onChange={(e) => handleRowChange(row.id, 'meal', e.target.value)} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="text" className="input-field" style={{ padding: '8px' }} value={row.supplements} onChange={(e) => handleRowChange(row.id, 'supplements', e.target.value)} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="text" className="input-field" style={{ padding: '8px' }} value={row.exercise} onChange={(e) => handleRowChange(row.id, 'exercise', e.target.value)} />
                  </td>
                  
                  {/* Symptoms */}
                  <td style={{ padding: '8px', borderLeft: '1px solid rgba(0,0,0,0.05)' }}>
                    <input type="number" min="0" max="5" className="input-field" style={symptomInputStyle} value={row.cramp} onChange={(e) => handleRowChange(row.id, 'cramp', e.target.value)} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="number" min="0" max="5" className="input-field" style={symptomInputStyle} value={row.bloating} onChange={(e) => handleRowChange(row.id, 'bloating', e.target.value)} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="number" min="0" max="5" className="input-field" style={symptomInputStyle} value={row.pressure} onChange={(e) => handleRowChange(row.id, 'pressure', e.target.value)} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <PainCell painArr={row.pain} onChange={(newArr) => handleRowChange(row.id, 'pain', newArr)} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="number" min="0" max="5" className="input-field" style={symptomInputStyle} value={row.itch} onChange={(e) => handleRowChange(row.id, 'itch', e.target.value)} />
                  </td>
                  <td style={{ padding: '8px', borderLeft: '1px solid rgba(0,0,0,0.05)' }}>
                    <input type="text" placeholder="Note" className="input-field" style={{ padding: '8px', width: '100%', minWidth: '80px' }} value={row.notes} onChange={(e) => handleRowChange(row.id, 'notes', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      <div className="glass-panel delay-150" style={{ marginBottom: '24px', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem' }}>Bowel Movements</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label className="input-label" style={{ margin: 0, fontSize: '0.85rem' }}>Total Count:</label>
            <input type="number" min="0" name="bowel_movement_count" value={formData.bowel_movement_count} onChange={(e) => {
                const count = parseInt(e.target.value) || 0;
                setFormData(prev => {
                    const newBMs = [...(prev.bowel_movements || [])];
                    if (count > newBMs.length) {
                        for (let i = newBMs.length; i < count; i++) {
                            newBMs.push({ complete: 'Complete', scale: '' });
                        }
                    } else if (count < newBMs.length) {
                        newBMs.length = count;
                    }
                    return { ...prev, bowel_movement_count: e.target.value, bowel_movements: newBMs };
                });
            }} className="input-field" style={{ width: '80px', padding: '6px 8px', fontSize: '0.9rem', minHeight: 'auto' }} />
          </div>

          {/* Dynamic BM Rows */}
          {formData.bowel_movements && formData.bowel_movements.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {formData.bowel_movements.map((bm, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', width: '50px' }}>BM {idx + 1}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label className="input-label" style={{ fontSize: '0.75rem', margin: 0 }}>Type:</label>
                              <select value={bm.complete} onChange={(e) => {
                                  const newBMs = [...formData.bowel_movements];
                                  newBMs[idx].complete = e.target.value;
                                  setFormData(prev => ({ ...prev, bowel_movements: newBMs }));
                              }} className="input-field" style={{ width: '110px', padding: '4px', fontSize: '0.8rem', minHeight: 'auto' }}>
                                  <option value="Complete">Complete</option>
                                  <option value="Incomplete">Incomplete</option>
                              </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label className="input-label" style={{ fontSize: '0.75rem', margin: 0 }}>Scale (1-7):</label>
                              <input type="number" min="1" max="7" value={bm.scale} onChange={(e) => {
                                  const newBMs = [...formData.bowel_movements];
                                  newBMs[idx].scale = e.target.value;
                                  setFormData(prev => ({ ...prev, bowel_movements: newBMs }));
                              }} className="input-field" style={{ width: '60px', padding: '4px', fontSize: '0.8rem', minHeight: 'auto' }} />
                          </div>
                      </div>
                  ))}
              </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 12px' }}>
        {error && (
          <div style={{ marginTop: '24px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button className="btn" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }} onClick={handleClearData} disabled={saving}>
            Clear Form Data
          </button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveClick} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : (hasExistingData ? 'Update & Save Changes' : 'Save Entire Day to Database')}
          </button>
        </div>
      </div>
    </div>
  );
}
