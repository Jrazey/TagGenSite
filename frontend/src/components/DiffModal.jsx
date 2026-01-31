
import React, { useState } from 'react';
import { X, Check, FileText, Activity, Bell, ChevronDown, ChevronRight } from 'lucide-react';

const DiffModal = ({ isOpen, onClose, diff, onConfirm }) => {
    if (!isOpen || !diff) return null;

    const [activeTab, setActiveTab] = useState('variable');
    const [expandedRecords, setExpandedRecords] = useState({});

    const toggleRecord = (key) => {
        setExpandedRecords(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const tabStyle = (id) => ({
        padding: '8px 16px',
        cursor: 'pointer',
        borderBottom: activeTab === id ? '2px solid var(--accent-color)' : '2px solid transparent',
        color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 6
    });

    // Count changes for tab badges
    const getChangeCount = (tableType) => {
        const changes = diff[tableType];
        if (!changes) return 0;
        return (changes.new?.length || 0) + (changes.modified?.length || 0) + (changes.orphaned?.length || 0);
    };

    // Styles for diff highlighting
    const styles = {
        newRow: { background: 'rgba(50, 200, 50, 0.15)' },
        deletedRow: { background: 'rgba(200, 50, 50, 0.15)' },
        modifiedField: { background: 'rgba(255, 200, 0, 0.25)', fontWeight: 600 },
        fieldName: { color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', padding: '4px 8px', borderRight: '1px solid #333' },
        fieldValue: { padding: '4px 8px', fontFamily: 'monospace', fontSize: '0.85rem' },
        recordHeader: {
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: 'rgba(0,0,0,0.3)', cursor: 'pointer', borderRadius: 4, marginBottom: 4,
            userSelect: 'none'
        }
    };

    // Render side-by-side comparison for a single modified record
    const renderModifiedRecord = (modItem, index) => {
        const { existing, proposed, changed_fields } = modItem;
        const recordKey = proposed?.NAME || proposed?.TAG || `record-${index}`;
        const isExpanded = expandedRecords[recordKey] !== false; // Default expanded

        // Get all unique field names
        const allFields = [...new Set([...Object.keys(existing || {}), ...Object.keys(proposed || {})])];
        // Filter to only show fields with differences, or all if toggled
        const fieldsToShow = allFields.filter(f => changed_fields?.includes(f));

        return (
            <div key={recordKey} style={{ marginBottom: 8 }}>
                <div style={styles.recordHeader} onClick={() => toggleRecord(recordKey)}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span style={{ fontWeight: 600, color: 'var(--warning-color)' }}>{recordKey}</span>
                    <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>({changed_fields?.length || 0} changes)</span>
                </div>

                {isExpanded && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginLeft: 20 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                                <th style={{ ...styles.fieldName, width: 150, textAlign: 'left' }}>Field</th>
                                <th style={{ ...styles.fieldValue, width: '40%', textAlign: 'left', background: 'rgba(200, 50, 50, 0.1)' }}>Current (Disk)</th>
                                <th style={{ ...styles.fieldValue, width: '40%', textAlign: 'left', background: 'rgba(50, 200, 50, 0.1)' }}>Proposed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fieldsToShow.map(field => {
                                const existingVal = existing?.[field] || '';
                                const proposedVal = proposed?.[field] || '';
                                const isChanged = changed_fields?.includes(field);

                                return (
                                    <tr key={field} style={{ borderBottom: '1px solid #222' }}>
                                        <td style={styles.fieldName}>{field}</td>
                                        <td style={{
                                            ...styles.fieldValue,
                                            background: isChanged ? 'rgba(200, 50, 50, 0.15)' : 'transparent',
                                            color: isChanged ? '#ff8888' : 'inherit'
                                        }}>
                                            {existingVal || <span style={{ opacity: 0.3 }}>—</span>}
                                        </td>
                                        <td style={{
                                            ...styles.fieldValue,
                                            background: isChanged ? 'rgba(50, 200, 50, 0.15)' : 'transparent',
                                            color: isChanged ? '#88ff88' : 'inherit'
                                        }}>
                                            {proposedVal || <span style={{ opacity: 0.3 }}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        );
    };

    const renderChanges = (tableType) => {
        const changes = diff[tableType];
        if (!changes) return <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No changes found for {tableType}.</div>;

        const hasChanges = (changes.new?.length || 0) > 0 || (changes.modified?.length || 0) > 0 || (changes.orphaned?.length || 0) > 0;
        if (!hasChanges) return <div style={{ padding: 20, textAlign: 'center', color: '#4a4' }}>✓ No changes detected. Files are in sync.</div>;

        return (
            <div style={{ padding: '0 16px' }}>
                {/* NEW */}
                {changes.new?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <h5 style={{ color: '#4a4', margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ background: 'rgba(50, 200, 50, 0.2)', padding: '2px 8px', borderRadius: 4 }}>+ NEW</span>
                            <span style={{ opacity: 0.6, fontWeight: 400 }}>{changes.new.length} records will be added</span>
                        </h5>
                        <div style={{ background: 'rgba(50, 200, 50, 0.1)', borderRadius: 4, padding: 8 }}>
                            {changes.new.map((r, i) => (
                                <div key={i} style={{ padding: '4px 8px', borderBottom: i < changes.new.length - 1 ? '1px solid #333' : 'none' }}>
                                    <span style={{ fontWeight: 600, color: '#88ff88' }}>{r.NAME || r.TAG}</span>
                                    <span style={{ marginLeft: 12, opacity: 0.7 }}>{r.COMMENT || r.DESC || ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MODIFIED - Side-by-Side */}
                {changes.modified?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <h5 style={{ color: '#ca4', margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ background: 'rgba(255, 200, 0, 0.2)', padding: '2px 8px', borderRadius: 4 }}>~ MODIFIED</span>
                            <span style={{ opacity: 0.6, fontWeight: 400 }}>{changes.modified.length} records will be updated</span>
                        </h5>
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            {changes.modified.map((modItem, i) => renderModifiedRecord(modItem, i))}
                        </div>
                    </div>
                )}

                {/* ORPHANED */}
                {changes.orphaned?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <h5 style={{ color: '#a44', margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ background: 'rgba(200, 50, 50, 0.2)', padding: '2px 8px', borderRadius: 4 }}>- ORPHANED</span>
                            <span style={{ opacity: 0.6, fontWeight: 400 }}>{changes.orphaned.length} records will be removed</span>
                        </h5>
                        <div style={{ background: 'rgba(200, 50, 50, 0.1)', borderRadius: 4, padding: 8 }}>
                            {changes.orphaned.map((r, i) => (
                                <div key={i} style={{ padding: '4px 8px', borderBottom: i < changes.orphaned.length - 1 ? '1px solid #333' : 'none' }}>
                                    <span style={{ color: '#ff8888', textDecoration: 'line-through' }}>{r.NAME || r.TAG}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div style={{
                background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
                width: '90%', maxWidth: 1200, height: '85%', display: 'flex', flexDirection: 'column',
                boxShadow: '0 10px 40px rgba(0,0,0,0.7)'
            }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={20} /> Review Changes
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.3)' }}>
                    <div onClick={() => setActiveTab('variable')} style={tabStyle('variable')}>
                        <FileText size={14} /> Variable.dbf
                        {getChangeCount('variable') > 0 && (
                            <span style={{ background: 'var(--accent-color)', color: 'black', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>
                                {getChangeCount('variable')}
                            </span>
                        )}
                    </div>
                    <div onClick={() => setActiveTab('trend')} style={tabStyle('trend')}>
                        <Activity size={14} /> Trend.dbf
                        {getChangeCount('trend') > 0 && (
                            <span style={{ background: 'var(--accent-color)', color: 'black', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>
                                {getChangeCount('trend')}
                            </span>
                        )}
                    </div>
                    <div onClick={() => setActiveTab('digalm')} style={tabStyle('digalm')}>
                        <Bell size={14} /> DigAlm.dbf
                        {getChangeCount('digalm') > 0 && (
                            <span style={{ background: 'var(--accent-color)', color: 'black', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>
                                {getChangeCount('digalm')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 0', overflow: 'auto', flex: 1 }}>
                    {renderChanges(activeTab)}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
                    <button onClick={onClose} style={{ minWidth: 100, padding: '8px 16px' }}>Cancel</button>
                    <button className="primary" onClick={onConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140, justifyContent: 'center', padding: '8px 16px' }}>
                        <Check size={16} /> Confirm Write
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiffModal;
