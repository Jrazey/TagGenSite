
import React, { useState, useEffect } from 'react';
import { X, Save, Lock, Unlock } from 'lucide-react';

const TagDetailModal = ({ isOpen, onClose, tag, onSave }) => {
    if (!isOpen || !tag) return null;

    const [formData, setFormData] = useState({ ...tag });
    const [activeTab, setActiveTab] = useState('other'); // Default to Shared

    useEffect(() => {
        setFormData({ ...tag });
    }, [tag]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };

            // Shared Name Sync
            if (field === 'citectName') {
                newState.trendName = value;
                newState.alarmName = value; // Usually alarm tag = variable tag unless suffix is used
                // But user asked for "Alarm Tag" to be shared. 
                // If they meant the Alarm Name (Desc), that's different.
                // Usually Alarm Tag = [Cluster]Prefix_Address_Alm or similar.
                // But assuming User wants strictly "Variable Tag Name = Trend Tag Name = Alarm Tag"
                // This implies the unique identifier key for the alarm record.
            }
            return newState;
        });
    };

    const tabs = [
        { id: 'other', label: 'Shared / Identity' },
        { id: 'variable', label: 'Variable.dbf' },
        { id: 'trend', label: 'Trend.dbf' },
        { id: 'digalm', label: 'DigAlm.dbf' }
    ];

    const tabStyle = (id) => ({
        padding: '8px 16px',
        cursor: 'pointer',
        borderBottom: activeTab === id ? '2px solid var(--accent-color)' : '2px solid transparent',
        color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: activeTab === id ? 600 : 400
    });

    const labelStyle = { display: 'block', marginBottom: 4, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = {
        width: '100%', padding: 6, background: '#252526', border: '1px solid #3E3E42',
        color: 'white', borderRadius: 2, fontSize: '0.9rem'
    };
    const rowStyle = { display: 'flex', gap: 16, marginBottom: 12 };

    // Helper to render a field
    const Field = ({ label, field, placeholder, width }) => (
        <div style={{ flex: width ? 'none' : 1, width: width, marginBottom: 12 }}>
            <label style={labelStyle}>{label}</label>
            <input
                value={formData[field] || ''}
                onChange={e => handleChange(field, e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
            />
        </div>
    );

    const CheckField = ({ label, field }) => (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={formData[field]} onChange={e => handleChange(field, e.target.checked)} />
                <span style={{ fontWeight: 600, color: formData[field] ? 'var(--accent-color)' : 'inherit' }}>{label}</span>
            </label>
        </div>
    );

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
        }}>
            <div style={{
                background: '#1E1E1E', border: '1px solid #333', borderRadius: '4px',
                width: '800px', height: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}>
                {/* Header */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2D2D30' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>TAG CONFIGURATION</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formData.citectName || formData.name || 'New Tag'}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#252526', paddingLeft: 12 }}>
                    {tabs.map(t => (
                        <div key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>
                            {t.label}
                        </div>
                    ))}
                </div>

                {/* Content using Grid System */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

                    {/* --- SHARED / IDENTITY TAB --- */}
                    {activeTab === 'other' && (
                        <div>
                            <div style={{ marginBottom: 24, borderBottom: '1px solid #333', paddingBottom: 16 }}>
                                <div style={rowStyle}>
                                    <Field label="Tag Name (Shared)" field="citectName" />
                                    <Field label="Cluster (Shared)" field="cluster" />
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginBottom: 12 }}>
                                    * Setting "Tag Name" here updates Variable Name, Trend Name, and Alarm Tag.
                                </div>
                            </div>

                            <div style={rowStyle}>
                                <Field label="Project" field="projectName" />
                                <Field label="Udt Type" field="udt_type" />
                            </div>
                            <div style={rowStyle}>
                                <Field label="Comment (Trend)" field="trendComment" />
                                <Field label="Comment (Alarm)" field="alarmComment" />
                            </div>
                        </div>
                    )}

                    {/* --- VARIABLE TAB --- */}
                    {activeTab === 'variable' && (
                        <>
                            {/* Removed Name & Cluster */}
                            <div style={rowStyle}>
                                <Field label="Address" field="address" />
                                <Field label="Data Type" field="dataType" />
                                <Field label="I/O Device" field="ioDevice" />
                            </div>
                            <div style={rowStyle}>
                                <Field label="Eng Units" field="engUnits" />
                                <Field label="Format" field="format" />
                                <Field label="Deadband" field="deadband" />
                            </div>
                            <div style={rowStyle}>
                                <Field label="Raw Zero" field="rawZero" />
                                <Field label="Raw Full" field="rawFull" />
                                <Field label="Eng Zero" field="engZero" />
                                <Field label="Eng Full" field="engFull" />
                            </div>
                            <div style={rowStyle}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Comment</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={e => handleChange('description', e.target.value)}
                                        style={{ ...inputStyle, height: 60 }}
                                    />
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 8 }}>
                                <label style={{ ...labelStyle, marginBottom: 12 }}>Advanced Variable Settings</label>
                                <div style={rowStyle}>
                                    <Field label="Equipment" field="equipment" />
                                    <Field label="Item" field="item" />
                                    <Field label="TagGen Link" field="tagGenLink" />
                                </div>
                                <div style={rowStyle}>
                                    <Field label="Linked" field="linked" />
                                    <Field label="Edit Code" field="editCode" />
                                    <Field label="Historian" field="historian" />
                                </div>
                                <div style={rowStyle}>
                                    <Field label="Custom 1" field="custom1" />
                                    <Field label="Custom 2" field="custom2" />
                                    <Field label="Custom 3" field="custom3" />
                                    <Field label="Custom 4" field="custom4" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- TREND TAB --- */}
                    {activeTab === 'trend' && (
                        <>
                            <CheckField label="Enable Trending" field="isTrend" />

                            {formData.isTrend ? (
                                <>
                                    {/* Removed Name, Cluster */}
                                    <div style={rowStyle}>
                                        <Field label="Expression" field="trendExpression" />
                                        <Field label="Trigger" field="trendTrigger" />
                                    </div>
                                    <div style={rowStyle}>
                                        <Field label="Sample Period" field="samplePeriod" />
                                        <Field label="Type" field="trendType" />
                                    </div>
                                    <div style={rowStyle}>
                                        <Field label="Privilege" field="trendPriv" />
                                        <Field label="Area" field="trendArea" />
                                    </div>

                                    <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 8, marginBottom: 16 }}>
                                        <label style={labelStyle}>Storage & History</label>
                                    </div>

                                    <div style={rowStyle}>
                                        <Field label="File Name" field="trendFilename" />
                                        <Field label="No. Files" field="trendFiles" />
                                        <Field label="Time" field="trendTime" />
                                        <Field label="Period" field="trendPeriod" />
                                    </div>
                                    <div style={rowStyle}>
                                        <Field label="Storage Method" field="trendStorage" />
                                    </div>
                                </>
                            ) : <div style={{ opacity: 0.5 }}>Check "Enable Trending" to configure.</div>}
                        </>
                    )}

                    {/* --- ALARM TAB --- */}
                    {activeTab === 'digalm' && (
                        <>
                            <CheckField label="Enable Alarm" field="isAlarm" />

                            {formData.isAlarm ? (
                                <>
                                    {/* Removed TagName */}
                                    <div style={rowStyle}>
                                        <Field label="Alarm Name (Desc)" field="alarmDesc" />
                                        <Field label="Category" field="alarmCategory" />
                                    </div>
                                    <div style={rowStyle}>
                                        <Field label="Var A" field="alarmVarA" />
                                        <Field label="Var B" field="alarmVarB" />
                                    </div>

                                    <div style={rowStyle}>
                                        <Field label="Priority" field="alarmPriority" />
                                        <Field label="Area" field="alarmArea" />
                                        <Field label="Privilege" field="alarmPriv" />
                                    </div>

                                    <div style={rowStyle}>
                                        <Field label="Help Msg" field="alarmHelp" />
                                        <Field label="Delay" field="alarmDelay" />
                                    </div>
                                </>
                            ) : <div style={{ opacity: 0.5 }}>Check "Enable Alarm" to configure.</div>}
                        </>
                    )}

                </div>

                {/* Footer */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#2D2D30' }}>
                    <button onClick={onClose} style={{ minWidth: 80, padding: '8px 16px', borderRadius: 4, border: '1px solid #444', background: 'transparent', color: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button className="primary" onClick={() => onSave(formData)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagDetailModal;
