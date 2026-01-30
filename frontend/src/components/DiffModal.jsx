
import React, { useState } from 'react';
import { X, Check, FileText, Activity, Bell } from 'lucide-react';

const DiffModal = ({ isOpen, onClose, diff, onConfirm }) => {
    if (!isOpen || !diff) return null;

    const [activeTab, setActiveTab] = useState('variable'); // variable, trend, digalm

    const tabStyle = (id) => ({
        padding: '8px 16px',
        cursor: 'pointer',
        borderBottom: activeTab === id ? '2px solid var(--accent-color)' : '2px solid transparent',
        color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 6
    });

    const renderChanges = (tableType) => {
        const changes = diff[tableType];
        if (!changes) return <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No changes found for {tableType}.</div>;

        const hasChanges = changes.new.length > 0 || changes.modified.length > 0 || changes.orphaned.length > 0;
        if (!hasChanges) return <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No changes detected.</div>;

        return (
            <div style={{ padding: '0 16px' }}>
                {/* NEW */}
                {changes.new.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <h5 style={{ color: 'var(--success-color)', margin: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>[NEW]</span> <span style={{ opacity: 0.6 }}>{changes.new.length} records</span>
                        </h5>
                        <table className="tag-grid" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Name/Tag</th>
                                    <th>Address</th>
                                    {tableType === 'trend' && <th>Sample Period</th>}
                                    {tableType === 'digalm' && <th>Category</th>}
                                    <th>Desc</th>
                                </tr>
                            </thead>
                            <tbody>
                                {changes.new.map((r, i) => (
                                    <tr key={i}>
                                        <td>{r.NAME || r.TAG}</td>
                                        <td>{r.ADDR || '-'}</td>
                                        {tableType === 'trend' && <td>{r.SAMPLEPER}</td>}
                                        {tableType === 'digalm' && <td>{r.CATEGORY}</td>}
                                        <td>{r.COMMENT || r.DESC}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* MODIFIED */}
                {changes.modified.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <h5 style={{ color: 'var(--warning-color)', margin: '8px 0' }}>[MODIFIED] ({changes.modified.length})</h5>
                        <table className="tag-grid" style={{ width: '100%' }}>
                            <thead><tr><th>Name</th><th>GUID</th></tr></thead>
                            <tbody>
                                {changes.modified.map((r, i) => (
                                    <tr key={i}>
                                        <td>{r.NAME || r.TAG}</td>
                                        <td>{r.GUID || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ORPHANED */}
                {changes.orphaned.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <h5 style={{ color: 'var(--danger-color)', margin: '8px 0' }}>[ORPHANED] ({changes.orphaned.length})</h5>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7, lineHeight: 1.6 }}>
                            {changes.orphaned.map(r => (r.NAME || r.TAG)).join(', ')}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div style={{
                background: '#1E1E1E', border: '1px solid #333', borderRadius: '8px',
                width: '85%', height: '85%', display: 'flex', flexDirection: 'column',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                    <h3>Review Changes</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white' }}><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.2)' }}>
                    <div onClick={() => setActiveTab('variable')} style={tabStyle('variable')}>
                        <FileText size={14} /> Variable.dbf
                    </div>
                    <div onClick={() => setActiveTab('trend')} style={tabStyle('trend')}>
                        <Activity size={14} /> Trend.dbf
                    </div>
                    <div onClick={() => setActiveTab('digalm')} style={tabStyle('digalm')}>
                        <Bell size={14} /> DigAlm.dbf
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 0', overflow: 'auto', flex: 1 }}>
                    {renderChanges(activeTab)}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{ minWidth: 80 }}>Cancel</button>
                    <button className="primary" onClick={onConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100, justifyContent: 'center' }}>
                        <Check size={16} /> Confirm Write
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiffModal;
