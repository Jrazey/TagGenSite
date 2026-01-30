import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const UDTMemberDetailModal = ({ isOpen, member, onSave, onClose }) => {
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('variable');

    useEffect(() => {
        if (isOpen && member) {
            // Deep copy to simple object
            setData(JSON.parse(JSON.stringify(member)));
        }
    }, [isOpen, member]);

    const handleSave = () => {
        onSave(data);
        onClose();
    };

    if (!isOpen || !data) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1400
        }}>
            <div style={{
                background: '#1E1E1E', border: '1px solid #444', borderRadius: '8px',
                width: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}>
                {/* Header */}
                <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#252526' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Edit Member: {data.suffix}</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}><X /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#2D2D30' }}>
                    {['variable', 'trend', 'alarm'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1, padding: '12px', background: 'none', border: 'none',
                                color: activeTab === tab ? '#fff' : '#888',
                                borderBottom: activeTab === tab ? '2px solid var(--accent-color)' : '2px solid transparent',
                                cursor: 'pointer', textTransform: 'capitalize'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto' }}>
                    {activeTab === 'variable' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group span-2">
                                <label>Suffix (Name Ext)</label>
                                <input value={data.suffix} onChange={e => setData({ ...data, suffix: e.target.value })} />
                                <small style={{ color: '#666' }}>Appended to Parent Name (e.g. .Run)</small>
                            </div>
                            <div className="form-group span-2">
                                <label>Offset (Addr Ext)</label>
                                <input value={data.address_offset} onChange={e => setData({ ...data, address_offset: e.target.value })} />
                                <small style={{ color: '#666' }}>Appended to Parent Address (e.g. .Run for AB)</small>
                            </div>
                            <div className="form-group">
                                <label>Data Type</label>
                                <select value={data.type} onChange={e => setData({ ...data, type: e.target.value })}>
                                    {['DIGITAL', 'INT', 'REAL', 'STRING', 'LONG', 'UINT'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Input/Calculated</label>
                                <select value={data.calcType || 'Input'} onChange={e => setData({ ...data, calcType: e.target.value })}>
                                    <option value="Input">Input (PLC)</option>
                                    <option value="Memory">Memory (Internal)</option>
                                </select>
                            </div>
                            <div className="form-group span-2">
                                <label>Comment Template</label>
                                <input value={data.comment_template} onChange={e => setData({ ...data, comment_template: e.target.value })} />
                                <small style={{ color: '#666' }}>Use {'{parent_desc}'} for parent description</small>
                            </div>
                            <div className="form-group">
                                <label>Eng Units</label>
                                <input value={data.engUnits || ''} onChange={e => setData({ ...data, engUnits: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Format</label>
                                <input value={data.format || ''} onChange={e => setData({ ...data, format: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Zero Scale</label>
                                <input value={data.engZero || ''} onChange={e => setData({ ...data, engZero: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Full Scale</label>
                                <input value={data.engFull || ''} onChange={e => setData({ ...data, engFull: e.target.value })} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'trend' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <input type="checkbox" checked={data.is_trend} onChange={e => setData({ ...data, is_trend: e.target.checked })} style={{ width: 'auto' }} />
                                <label style={{ margin: 0 }}>Enable Trend?</label>
                            </div>

                            {data.is_trend && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Sample Period</label>
                                        <input value={data.sample_period || '00:00:01'} onChange={e => setData({ ...data, sample_period: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Trend Type</label>
                                        <select value={data.trend_type || 'TRN_PERIODIC'} onChange={e => setData({ ...data, trend_type: e.target.value })}>
                                            <option value="TRN_PERIODIC">Periodic</option>
                                            <option value="TRN_EVENT">Event</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Files</label>
                                        <input value={data.trend_files || ''} onChange={e => setData({ ...data, trend_files: e.target.value })} placeholder="e.g. 2" />
                                    </div>
                                    <div className="form-group">
                                        <label>Storage Method</label>
                                        <select value={data.trend_storage || 'Scaled'} onChange={e => setData({ ...data, trend_storage: e.target.value })}>
                                            <option value="Scaled">Scaled (2-byte)</option>
                                            <option value="Floating Point">Floating Point (8-byte)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'alarm' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <input type="checkbox" checked={data.is_alarm} onChange={e => setData({ ...data, is_alarm: e.target.checked })} style={{ width: 'auto' }} />
                                <label style={{ margin: 0 }}>Enable Alarm?</label>
                            </div>

                            {data.is_alarm && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Category</label>
                                        <input value={data.alarm_category || '1'} onChange={e => setData({ ...data, alarm_category: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Priority</label>
                                        <input value={data.alarm_priority || '1'} onChange={e => setData({ ...data, alarm_priority: e.target.value })} />
                                    </div>
                                    <div className="form-group span-2">
                                        <label>Alarm Help / Desc</label>
                                        <input value={data.alarm_help || ''} onChange={e => setData({ ...data, alarm_help: e.target.value })} placeholder="Help text..." />
                                    </div>
                                    <div className="form-group">
                                        <label>Area</label>
                                        <input value={data.alarm_area || ''} onChange={e => setData({ ...data, alarm_area: e.target.value })} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#252526' }}>
                    <button onClick={onClose} className="secondary">Cancel</button>
                    <button onClick={handleSave} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Save size={16} /> Update Member
                    </button>
                </div>
            </div>

            <style>{`
                .form-group { display: flex; flexDirection: column; gap: 4px; }
                .form-group label { font-size: 0.85rem; color: #aaa; }
                .form-group input, .form-group select { 
                    padding: 8px; background: #111; border: 1px solid #444; color: white; borderRadius: 4px;
                }
                .form-group.span-2 { grid-column: span 2; }
            `}</style>
        </div>
    );
};

export default UDTMemberDetailModal;
