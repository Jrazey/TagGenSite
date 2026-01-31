import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const UDTMemberDetailModal = ({ isOpen, member, onSave, onClose }) => {
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('variable');

    useEffect(() => {
        if (isOpen && member) {
            setData(JSON.parse(JSON.stringify(member)));
        }
    }, [isOpen, member]);

    const handleSave = () => {
        onSave(data);
        onClose();
    };

    if (!isOpen || !data) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">Edit Member: {data.suffix}</div>
                    <button onClick={onClose} className="close-btn"><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    {['variable', 'trend', 'alarm'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="modal-content">
                    {activeTab === 'variable' && (
                        <div className="form-grid">
                            <div className="form-row">
                                <div className="form-field">
                                    <label>Suffix (Name Extension)</label>
                                    <input value={data.suffix} onChange={e => setData({ ...data, suffix: e.target.value })} />
                                    <span className="hint">Appended to Parent Name (e.g. .Run)</span>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-field">
                                    <label>Address Offset</label>
                                    <input value={data.address_offset} onChange={e => setData({ ...data, address_offset: e.target.value })} />
                                    <span className="hint">Appended to Parent Address (e.g. .RunStatus)</span>
                                </div>
                            </div>
                            <div className="form-row cols-2">
                                <div className="form-field">
                                    <label>Data Type</label>
                                    <select value={data.type} onChange={e => setData({ ...data, type: e.target.value })}>
                                        {['DIGITAL', 'INT', 'REAL', 'STRING', 'LONG', 'UINT'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Format</label>
                                    <input value={data.format || ''} onChange={e => setData({ ...data, format: e.target.value })} placeholder="#.##" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-field">
                                    <label>Comment Template</label>
                                    <input value={data.comment_template} onChange={e => setData({ ...data, comment_template: e.target.value })} />
                                    <span className="hint">Use {'{parent_desc}'} to insert parent description</span>
                                </div>
                            </div>
                            <div className="form-row cols-3">
                                <div className="form-field">
                                    <label>Eng Units</label>
                                    <input value={data.engUnits || ''} onChange={e => setData({ ...data, engUnits: e.target.value })} />
                                </div>
                                <div className="form-field">
                                    <label>Zero Scale</label>
                                    <input value={data.engZero || ''} onChange={e => setData({ ...data, engZero: e.target.value })} placeholder="0" />
                                </div>
                                <div className="form-field">
                                    <label>Full Scale</label>
                                    <input value={data.engFull || ''} onChange={e => setData({ ...data, engFull: e.target.value })} placeholder="100" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'trend' && (
                        <div className="form-grid">
                            <div className="form-row">
                                <label className="checkbox-field">
                                    <input type="checkbox" checked={data.is_trend} onChange={e => setData({ ...data, is_trend: e.target.checked })} />
                                    <span>Enable Trend</span>
                                </label>
                            </div>

                            {data.is_trend && (
                                <>
                                    <div className="form-row cols-2">
                                        <div className="form-field">
                                            <label>Sample Period</label>
                                            <input value={data.sample_period || '00:00:01'} onChange={e => setData({ ...data, sample_period: e.target.value })} />
                                        </div>
                                        <div className="form-field">
                                            <label>Trend Type</label>
                                            <select value={data.trend_type || 'TRN_PERIODIC'} onChange={e => setData({ ...data, trend_type: e.target.value })}>
                                                <option value="TRN_EVENT">TRN_EVENT</option>
                                                <option value="TRN_PERIODIC">TRN_PERIODIC</option>
                                                <option value="TRN_PERIODIC_EVENT">TRN_PERIODIC_EVENT</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row cols-2">
                                        <div className="form-field">
                                            <label>Files</label>
                                            <input value={data.trend_files || ''} onChange={e => setData({ ...data, trend_files: e.target.value })} placeholder="2" />
                                        </div>
                                        <div className="form-field">
                                            <label>Storage Method</label>
                                            <select value={data.trend_storage || 'Scaled'} onChange={e => setData({ ...data, trend_storage: e.target.value })}>
                                                <option value="Scaled">Scaled (2-byte)</option>
                                                <option value="Floating Point">Floating Point (8-byte)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label>Trigger Expression</label>
                                            <input value={data.trend_trigger || ''} onChange={e => setData({ ...data, trend_trigger: e.target.value })} placeholder="Optional trigger condition" />
                                        </div>
                                    </div>
                                    <div className="form-row cols-2">
                                        <div className="form-field">
                                            <label>Privilege (1-8)</label>
                                            <input value={data.trend_priv || ''} onChange={e => setData({ ...data, trend_priv: e.target.value })} />
                                        </div>
                                        <div className="form-field">
                                            <label>Area</label>
                                            <input value={data.trend_area || ''} onChange={e => setData({ ...data, trend_area: e.target.value })} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'alarm' && (
                        <div className="form-grid">
                            <div className="form-row">
                                <label className="checkbox-field">
                                    <input type="checkbox" checked={data.is_alarm} onChange={e => setData({ ...data, is_alarm: e.target.checked })} />
                                    <span>Enable Alarm</span>
                                </label>
                            </div>

                            {data.is_alarm && (
                                <>
                                    <div className="form-row cols-2">
                                        <div className="form-field">
                                            <label>Category</label>
                                            <input value={data.alarm_category || '1'} onChange={e => setData({ ...data, alarm_category: e.target.value })} />
                                        </div>
                                        <div className="form-field">
                                            <label>Priority</label>
                                            <input value={data.alarm_priority || '1'} onChange={e => setData({ ...data, alarm_priority: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label>Description Template</label>
                                            <input value={data.alarm_desc || ''} onChange={e => setData({ ...data, alarm_desc: e.target.value })} />
                                            <span className="hint">Use {'{parent_desc}'} for parent description</span>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label>Help Text</label>
                                            <input value={data.alarm_help || ''} onChange={e => setData({ ...data, alarm_help: e.target.value })} placeholder="Guidance for operators" />
                                        </div>
                                    </div>
                                    <div className="form-row cols-3">
                                        <div className="form-field">
                                            <label>Area</label>
                                            <input value={data.alarm_area || ''} onChange={e => setData({ ...data, alarm_area: e.target.value })} />
                                        </div>
                                        <div className="form-field">
                                            <label>Privilege (1-8)</label>
                                            <input value={data.alarm_priv || ''} onChange={e => setData({ ...data, alarm_priv: e.target.value })} />
                                        </div>
                                        <div className="form-field">
                                            <label>Delay (seconds)</label>
                                            <input type="number" value={data.alarm_delay || ''} onChange={e => setData({ ...data, alarm_delay: e.target.value })} placeholder="0" />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSave} className="btn-primary">
                        <Save size={16} /> Update Member
                    </button>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.85); backdrop-filter: blur(4px);
                    display: flex; justify-content: center; align-items: center; z-index: 1400;
                }
                .modal-container {
                    background: #1E1E1E; border: 1px solid #444; border-radius: 8px;
                    width: 560px; max-height: 90vh; display: flex; flex-direction: column;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
                }
                .modal-header {
                    padding: 16px 20px; border-bottom: 1px solid #333; 
                    display: flex; justify-content: space-between; align-items: center; 
                    background: #252526;
                }
                .modal-title { font-size: 1.1rem; font-weight: 600; color: #fff; }
                .close-btn { background: none; border: none; color: #888; cursor: pointer; padding: 4px; }
                .close-btn:hover { color: #fff; }
                
                .modal-tabs { display: flex; border-bottom: 1px solid #333; background: #2D2D30; }
                .tab-btn {
                    flex: 1; padding: 12px; background: none; border: none;
                    color: #888; cursor: pointer; text-transform: capitalize;
                    border-bottom: 2px solid transparent; transition: all 0.2s;
                }
                .tab-btn:hover { color: #bbb; }
                .tab-btn.active { color: #fff; border-bottom-color: var(--accent-color, #0078d4); }
                
                .modal-content { padding: 20px 24px; overflow-y: auto; flex: 1; }
                
                .form-grid { display: flex; flex-direction: column; gap: 16px; }
                .form-row { display: grid; gap: 16px; }
                .form-row.cols-2 { grid-template-columns: 1fr 1fr; }
                .form-row.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
                
                .form-field { display: flex; flex-direction: column; gap: 6px; }
                .form-field label { font-size: 0.85rem; color: #aaa; font-weight: 500; }
                .form-field input, .form-field select { 
                    padding: 10px 12px; background: #111; border: 1px solid #444; 
                    color: white; border-radius: 4px; font-size: 0.95rem;
                }
                .form-field input:focus, .form-field select:focus {
                    border-color: var(--accent-color, #0078d4); outline: none;
                }
                .form-field .hint { font-size: 0.75rem; color: #666; margin-top: 2px; }
                
                .checkbox-field {
                    display: flex; align-items: center; gap: 10px; cursor: pointer;
                    padding: 8px 0; font-size: 0.95rem; color: #ddd;
                }
                .checkbox-field input[type="checkbox"] { 
                    width: 18px; height: 18px; accent-color: var(--accent-color, #0078d4); 
                }
                
                .modal-footer {
                    padding: 16px 20px; border-top: 1px solid #333; 
                    display: flex; justify-content: flex-end; gap: 12px; 
                    background: #252526;
                }
                .btn-secondary {
                    padding: 8px 16px; background: #333; border: 1px solid #555;
                    color: #ccc; border-radius: 4px; cursor: pointer;
                }
                .btn-secondary:hover { background: #444; color: #fff; }
                .btn-primary {
                    padding: 8px 16px; background: var(--accent-color, #0078d4); 
                    border: none; color: white; border-radius: 4px; cursor: pointer;
                    display: flex; align-items: center; gap: 6px; font-weight: 500;
                }
                .btn-primary:hover { filter: brightness(1.1); }
            `}</style>
        </div>
    );
};

export default UDTMemberDetailModal;
