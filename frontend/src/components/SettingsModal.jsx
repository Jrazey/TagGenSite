
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import axios from 'axios';

const SettingsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const [settings, setSettings] = useState({
        cluster: '',
        sample_period: '',
        trend_type: '',
        trend_history: '',
        alarm_category: '',
        alarm_priority: '',
        alarm_area: ''
    });

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/api/settings')
            .then(res => setSettings(res.data))
            .catch(console.error);
    }, []);

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            await axios.post('http://127.0.0.1:8000/api/settings', settings);
            onClose();
        } catch (e) {
            alert("Failed to save settings");
            console.error(e);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
            <div style={{
                background: '#1E1E1E', border: '1px solid #333', borderRadius: '8px',
                width: '400px', display: 'flex', flexDirection: 'column',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                    <h3>Project Defaults</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white' }}><X size={20} /></button>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#888' }}>Default Cluster</label>
                        <input
                            type="text"
                            value={settings.cluster}
                            onChange={e => handleChange('cluster', e.target.value)}
                            style={{ width: '100%', padding: 8, background: '#333', border: '1px solid #444', color: 'white' }}
                        />
                    </div>

                    <div style={{ borderTop: '1px solid #333', paddingTop: 12 }}>
                        <h5 style={{ margin: '0 0 8px 0', color: 'var(--accent-color)' }}>Trend Defaults</h5>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#888' }}>Sample Period</label>
                        <input
                            type="text"
                            value={settings.sample_period}
                            onChange={e => handleChange('sample_period', e.target.value)}
                            style={{ width: '100%', padding: 8, background: '#333', border: '1px solid #444', color: 'white', marginBottom: 8 }}
                        />
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#888' }}>History (Display Only)</label>
                        <input
                            type="text"
                            value={settings.trend_history}
                            onChange={e => handleChange('trend_history', e.target.value)}
                            style={{ width: '100%', padding: 8, background: '#333', border: '1px solid #444', color: 'white' }}
                        />
                    </div>

                    <div style={{ borderTop: '1px solid #333', paddingTop: 12 }}>
                        <h5 style={{ margin: '0 0 8px 0', color: 'var(--warning-color)' }}>Alarm Defaults</h5>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#888' }}>Category</label>
                                <input
                                    type="text"
                                    value={settings.alarm_category}
                                    onChange={e => handleChange('alarm_category', e.target.value)}
                                    style={{ width: '100%', padding: 8, background: '#333', border: '1px solid #444', color: 'white' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#888' }}>Priority</label>
                                <input
                                    type="text"
                                    value={settings.alarm_priority}
                                    onChange={e => handleChange('alarm_priority', e.target.value)}
                                    style={{ width: '100%', padding: 8, background: '#333', border: '1px solid #444', color: 'white' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{ minWidth: 80 }}>Cancel</button>
                    <button className="primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Save size={16} /> Save Defaults
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
