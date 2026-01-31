
import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, FileText, Activity, Bell, ChevronDown, ChevronRight, Plus, Trash2, RefreshCw } from 'lucide-react';

const DiffModal = ({ isOpen, onClose, diff, onConfirm }) => {
    if (!isOpen || !diff) return null;

    const [activeTab, setActiveTab] = useState('variable');
    const [expandedRecords, setExpandedRecords] = useState({});

    // Accept/Reject state for each table type
    // Keys: "variable_new_NAME", "variable_modified_NAME", "variable_orphaned_NAME", etc.
    const [acceptedChanges, setAcceptedChanges] = useState({});

    // Initialize all changes as accepted when diff changes
    useEffect(() => {
        const accepted = {};
        ['variable', 'trend', 'digalm'].forEach(tableType => {
            const changes = diff[tableType];
            if (!changes) return;

            changes.new?.forEach(r => {
                const key = `${tableType}_new_${r.NAME || r.TAG}`;
                accepted[key] = true;
            });
            changes.modified?.forEach(m => {
                const key = `${tableType}_modified_${m.proposed?.NAME || m.proposed?.TAG}`;
                accepted[key] = true;
            });
            changes.orphaned?.forEach(r => {
                const key = `${tableType}_orphaned_${r.NAME || r.TAG}`;
                accepted[key] = true;
            });
        });
        setAcceptedChanges(accepted);
    }, [diff]);

    const toggleChange = (key) => {
        setAcceptedChanges(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleRecord = (key) => {
        setExpandedRecords(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const selectAll = (tableType, changeType, value) => {
        setAcceptedChanges(prev => {
            const next = { ...prev };
            const changes = diff[tableType];
            if (!changes) return next;

            const items = changes[changeType] || [];
            items.forEach(r => {
                const name = changeType === 'modified'
                    ? (r.proposed?.NAME || r.proposed?.TAG)
                    : (r.NAME || r.TAG);
                const key = `${tableType}_${changeType}_${name}`;
                next[key] = value;
            });
            return next;
        });
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

    const getAcceptedCount = (tableType) => {
        let count = 0;
        Object.entries(acceptedChanges).forEach(([key, val]) => {
            if (key.startsWith(tableType + '_') && val) count++;
        });
        return count;
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
        },
        checkbox: { width: 16, height: 16, cursor: 'pointer' },
        sectionHeader: {
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap'
        }
    };

    // Render side-by-side comparison for a single modified record
    const renderModifiedRecord = (modItem, index, tableType) => {
        const { existing, proposed, changed_fields } = modItem;
        const recordKey = proposed?.NAME || proposed?.TAG || `record-${index}`;
        const acceptKey = `${tableType}_modified_${recordKey}`;
        const isExpanded = expandedRecords[recordKey] !== false; // Default expanded
        const isAccepted = acceptedChanges[acceptKey] !== false;

        // Get all unique field names
        const allFields = [...new Set([...Object.keys(existing || {}), ...Object.keys(proposed || {})])];
        // Filter to only show fields with differences
        const fieldsToShow = allFields.filter(f => changed_fields?.includes(f));

        return (
            <div key={recordKey} style={{ marginBottom: 8, opacity: isAccepted ? 1 : 0.5 }}>
                <div style={styles.recordHeader}>
                    <input
                        type="checkbox"
                        checked={isAccepted}
                        onChange={() => toggleChange(acceptKey)}
                        onClick={(e) => e.stopPropagation()}
                        style={styles.checkbox}
                    />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => toggleRecord(recordKey)}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span style={{ fontWeight: 600, color: 'var(--warning-color)' }}>{recordKey}</span>
                        <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>({changed_fields?.length || 0} changes)</span>
                    </div>
                </div>

                {isExpanded && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginLeft: 40 }}>
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

        const countAccepted = (type) => {
            const items = changes[type] || [];
            return items.filter(r => {
                const name = type === 'modified' ? (r.proposed?.NAME || r.proposed?.TAG) : (r.NAME || r.TAG);
                return acceptedChanges[`${tableType}_${type}_${name}`] !== false;
            }).length;
        };

        return (
            <div style={{ padding: '0 16px' }}>
                {/* NEW */}
                {changes.new?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={styles.sectionHeader}>
                            <Plus size={16} style={{ color: '#4a4' }} />
                            <span style={{ background: 'rgba(50, 200, 50, 0.2)', padding: '2px 8px', borderRadius: 4, color: '#4a4' }}>+ NEW</span>
                            <span style={{ opacity: 0.6, fontWeight: 400 }}>{countAccepted('new')}/{changes.new.length} will be written</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                <button onClick={() => selectAll(tableType, 'new', true)}
                                    style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#4a4', cursor: 'pointer' }}>
                                    Accept All
                                </button>
                                <button onClick={() => selectAll(tableType, 'new', false)}
                                    style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#a44', cursor: 'pointer' }}>
                                    Reject All
                                </button>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(50, 200, 50, 0.05)', borderRadius: 4, padding: 8, border: '1px solid #333' }}>
                            {changes.new.map((r, i) => {
                                const name = r.NAME || r.TAG;
                                const key = `${tableType}_new_${name}`;
                                const isAccepted = acceptedChanges[key] !== false;
                                return (
                                    <div key={i} style={{
                                        padding: '6px 8px',
                                        borderBottom: i < changes.new.length - 1 ? '1px solid #333' : 'none',
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        opacity: isAccepted ? 1 : 0.5
                                    }}>
                                        <input type="checkbox" checked={isAccepted} onChange={() => toggleChange(key)} style={styles.checkbox} />
                                        <span style={{ fontWeight: 600, color: '#88ff88' }}>+ {name}</span>
                                        <span style={{ marginLeft: 12, opacity: 0.7 }}>{r.COMMENT || r.DESC || ''}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* MODIFIED - Side-by-Side */}
                {changes.modified?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={styles.sectionHeader}>
                            <RefreshCw size={16} style={{ color: '#ca4' }} />
                            <span style={{ background: 'rgba(255, 200, 0, 0.2)', padding: '2px 8px', borderRadius: 4, color: '#ca4' }}>~ MODIFIED</span>
                            <span style={{ opacity: 0.6, fontWeight: 400 }}>{countAccepted('modified')}/{changes.modified.length} will be updated</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                <button onClick={() => selectAll(tableType, 'modified', true)}
                                    style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#ca4', cursor: 'pointer' }}>
                                    Accept All
                                </button>
                                <button onClick={() => selectAll(tableType, 'modified', false)}
                                    style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#666', cursor: 'pointer' }}>
                                    Keep Existing
                                </button>
                            </div>
                        </div>
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            {changes.modified.map((modItem, i) => renderModifiedRecord(modItem, i, tableType))}
                        </div>
                    </div>
                )}

                {/* ORPHANED */}
                {changes.orphaned?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={styles.sectionHeader}>
                            <Trash2 size={16} style={{ color: '#a44' }} />
                            <span style={{ background: 'rgba(200, 50, 50, 0.2)', padding: '2px 8px', borderRadius: 4, color: '#a44' }}>- ORPHANED</span>
                            <span style={{ opacity: 0.6, fontWeight: 400 }}>{countAccepted('orphaned')}/{changes.orphaned.length} will be removed</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                <button onClick={() => selectAll(tableType, 'orphaned', true)}
                                    style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#a44', cursor: 'pointer' }}>
                                    Remove All
                                </button>
                                <button onClick={() => selectAll(tableType, 'orphaned', false)}
                                    style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#4a4', cursor: 'pointer' }}>
                                    Keep All
                                </button>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(200, 50, 50, 0.05)', borderRadius: 4, padding: 8, border: '1px solid #333' }}>
                            {changes.orphaned.map((r, i) => {
                                const name = r.NAME || r.TAG;
                                const key = `${tableType}_orphaned_${name}`;
                                const isAccepted = acceptedChanges[key] !== false;
                                return (
                                    <div key={i} style={{
                                        padding: '6px 8px',
                                        borderBottom: i < changes.orphaned.length - 1 ? '1px solid #333' : 'none',
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        opacity: isAccepted ? 1 : 0.5
                                    }}>
                                        <input type="checkbox" checked={isAccepted} onChange={() => toggleChange(key)} style={styles.checkbox} />
                                        <span style={{ color: isAccepted ? '#ff8888' : '#888', textDecoration: isAccepted ? 'line-through' : 'none' }}>
                                            − {name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Build filtered diff based on accepted changes
    const handleConfirm = () => {
        const filteredDiff = {};

        ['variable', 'trend', 'digalm'].forEach(tableType => {
            const changes = diff[tableType];
            if (!changes) return;

            filteredDiff[tableType] = {
                new: (changes.new || []).filter(r => {
                    const key = `${tableType}_new_${r.NAME || r.TAG}`;
                    return acceptedChanges[key] !== false;
                }),
                modified: (changes.modified || []).filter(m => {
                    const key = `${tableType}_modified_${m.proposed?.NAME || m.proposed?.TAG}`;
                    return acceptedChanges[key] !== false;
                }),
                orphaned: (changes.orphaned || []).filter(r => {
                    const key = `${tableType}_orphaned_${r.NAME || r.TAG}`;
                    return acceptedChanges[key] !== false;
                })
            };
        });

        onConfirm(filteredDiff);
    };

    // Calculate total stats
    const totalChanges = ['variable', 'trend', 'digalm'].reduce((acc, t) => acc + getChangeCount(t), 0);
    const totalAccepted = ['variable', 'trend', 'digalm'].reduce((acc, t) => acc + getAcceptedCount(t), 0);

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
                    <div>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={20} /> Review Changes
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 4 }}>
                            {totalAccepted} of {totalChanges} changes will be applied
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.3)' }}>
                    <div onClick={() => setActiveTab('variable')} style={tabStyle('variable')}>
                        <FileText size={14} /> Variable.dbf
                        {getChangeCount('variable') > 0 && (
                            <span style={{ background: 'var(--accent-color)', color: 'black', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>
                                {getAcceptedCount('variable')}/{getChangeCount('variable')}
                            </span>
                        )}
                    </div>
                    <div onClick={() => setActiveTab('trend')} style={tabStyle('trend')}>
                        <Activity size={14} /> Trend.dbf
                        {getChangeCount('trend') > 0 && (
                            <span style={{ background: 'var(--accent-color)', color: 'black', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>
                                {getAcceptedCount('trend')}/{getChangeCount('trend')}
                            </span>
                        )}
                    </div>
                    <div onClick={() => setActiveTab('digalm')} style={tabStyle('digalm')}>
                        <Bell size={14} /> DigAlm.dbf
                        {getChangeCount('digalm') > 0 && (
                            <span style={{ background: 'var(--accent-color)', color: 'black', padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>
                                {getAcceptedCount('digalm')}/{getChangeCount('digalm')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 0', overflow: 'auto', flex: 1 }}>
                    {renderChanges(activeTab)}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        {totalAccepted} of {totalChanges} changes will be written to DBF files
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={onClose} style={{ minWidth: 100, padding: '8px 16px' }}>Cancel</button>
                        <button className="primary" onClick={handleConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140, justifyContent: 'center', padding: '8px 16px' }}>
                            <Check size={16} /> Confirm Write
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiffModal;
