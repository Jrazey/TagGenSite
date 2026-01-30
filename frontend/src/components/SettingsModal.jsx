
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import axios from 'axios';

const SettingsModal = ({ isOpen, onClose, project }) => {
    const [activeTab, setActiveTab] = useState('variable');
    const [settings, setSettings] = useState({});

    // Load settings when opened or project changes
    useEffect(() => {
        if (isOpen) {
            // Load Project Settings if project selected
            if (project) {
                axios.get(`http://127.0.0.1:8000/api/settings?project_path=${encodeURIComponent(project.path)}`)
                    .then(res => setSettings(res.data || {}))
                    .catch(console.error);
            } else {
                // Load Global Settings for System Tab
                axios.get(`http://127.0.0.1:8000/api/settings`)
                    .then(res => setSettings(res.data || {}))
                    .catch(console.error);
            }
        }
    }, [isOpen, project]);

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            await axios.post('http://127.0.0.1:8000/api/settings', {
                project_path: project ? project.path : null, // Null for global
                settings: settings
            });
            onClose();
        } catch (e) {
            alert("Failed to save settings");
            console.error(e);
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'variable', label: 'Variable Defaults' },
        { id: 'trend', label: 'Trend Defaults' },
        { id: 'alarm', label: 'Alarm Defaults' },
        { id: 'system', label: 'System' }
    ];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
            <div style={{
                background: '#1E1E1E', border: '1px solid #333', borderRadius: '8px',
                width: '600px', height: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#252526' }}>
                    <h3 style={{ margin: 0 }}>Project Defaults</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#2D2D30' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '12px 24px',
                                background: activeTab === tab.id ? '#1E1E1E' : 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '2px solid var(--accent-color)' : '2px solid transparent',
                                color: activeTab === tab.id ? 'white' : '#888',
                                cursor: 'pointer'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

                    {activeTab === 'variable' && (
                        <div className="grid-form">
                            <GroupHeader title="Identification" />
                            <Field label="Default Cluster" field="cluster" val={settings} onChange={handleChange} />

                            <GroupHeader title="Data Type & Eng Units" />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <Field label="Data Type" field="dataType" val={settings} onChange={handleChange} style={{ flex: 1 }} />
                                <Field label="Eng Units" field="engUnits" val={settings} onChange={handleChange} style={{ flex: 1 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <Field label="Eng Zero" field="engZero" val={settings} onChange={handleChange} style={{ flex: 1 }} />
                                <Field label="Eng Full" field="engFull" val={settings} onChange={handleChange} style={{ flex: 1 }} />
                            </div>
                            <Field label="Format" field="format" val={settings} onChange={handleChange} />
                        </div>
                    )}

                    {activeTab === 'trend' && (
                        <div className="grid-form">
                            <div style={{ marginBottom: 16, color: '#888', fontStyle: 'italic' }}>
                                Values here will autofill when you check "Trend?" on a tag.
                            </div>
                            <Field label="Trend Type" field="trend_type" val={settings} onChange={handleChange} placeholder="TRN_PERIODIC" />
                            <Field label="Sample Period" field="sample_period" val={settings} onChange={handleChange} placeholder="00:00:01" />
                            <Field label="Trend Storage" field="trend_storage" val={settings} onChange={handleChange} placeholder="Scaled" />
                            <Field label="Files" field="trend_files" val={settings} onChange={handleChange} placeholder="[-1] 52" />
                            <Field label="No. Files" field="no_files" val={settings} onChange={handleChange} placeholder="2" />
                        </div>
                    )}

                    {activeTab === 'alarm' && (
                        <div className="grid-form">
                            <div style={{ marginBottom: 16, color: '#888', fontStyle: 'italic' }}>
                                Values here will autofill when you check "Alarm?" on a tag.
                            </div>
                            <Field label="Alarm Category" field="alarm_category" val={settings} onChange={handleChange} />
                            <Field label="Alarm Priority" field="alarm_priority" val={settings} onChange={handleChange} />
                            <Field label="Alarm Area" field="alarm_area" val={settings} onChange={handleChange} />
                            <Field label="Help/Description" field="alarm_help" val={settings} onChange={handleChange} />
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="grid-form">
                            <div style={{ marginBottom: 16, color: '#888', fontStyle: 'italic' }}>
                                System-wide configurations.
                            </div>
                            <Field label="Projects Root Path" field="scada_root_path" val={settings} onChange={handleChange} style={{ width: '100%' }} />
                        </div>
                    )}
                </div>

                <div style={{ padding: '16px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#252526' }}>
                    <button onClick={onClose} className="secondary">Cancel</button>
                    <button className="primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Save size={16} /> Save Defaults
                    </button>
                </div>
            </div>
        </div>
    );
};

const GroupHeader = ({ title }) => (
    <div style={{
        fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)',
        marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em'
    }}>
        {title}
    </div>
);

const Field = ({ label, field, val, onChange, style, placeholder }) => (
    <div style={{ marginBottom: 12, ...style }}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: '#aaa' }}>{label}</label>
        <input
            type="text"
            value={val[field] || ''}
            onChange={e => onChange(field, e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%', padding: '8px 10px', background: '#111',
                border: '1px solid #444', color: 'white', borderRadius: 4,
                fontFamily: 'monospace'
            }}
        />
    </div>
);

export default SettingsModal;
