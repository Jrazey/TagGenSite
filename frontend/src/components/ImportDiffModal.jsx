
import React, { useState, useMemo } from 'react';
import { X, Check, Download, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * ImportDiffModal - Shows a preview of import changes with accept/reject toggles
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - currentTags: array - Current tags in the grid
 * - incomingTags: array - Tags from DBF import
 * - onConfirm: (acceptedNewTags, rejectedDeleteIds) => void
 */
const ImportDiffModal = ({ isOpen, onClose, currentTags, incomingTags, onConfirm }) => {
    if (!isOpen) return null;

    // Compute diff between current and incoming
    const diff = useMemo(() => {
        const currentByName = new Map(currentTags.map(t => [t.name, t]));
        const incomingByName = new Map(incomingTags.map(t => [t.name, t]));

        const newTags = []; // In incoming but not in current
        const deletedTags = []; // In current but not in incoming
        const unchangedCount = { count: 0 };

        // Find new tags
        incomingTags.forEach(tag => {
            if (!currentByName.has(tag.name)) {
                newTags.push(tag);
            } else {
                unchangedCount.count++;
            }
        });

        // Find deleted tags (in current but not in incoming)
        currentTags.forEach(tag => {
            if (!incomingByName.has(tag.name)) {
                deletedTags.push(tag);
            }
        });

        return { newTags, deletedTags, unchangedCount: unchangedCount.count };
    }, [currentTags, incomingTags]);

    // State for accept/reject toggles (default: all accepted)
    const [acceptedNew, setAcceptedNew] = useState(() =>
        new Set(diff.newTags.map(t => t.name))
    );
    const [acceptedDeletes, setAcceptedDeletes] = useState(() =>
        new Set(diff.deletedTags.map(t => t.name))
    );

    // Expanded sections
    const [expandedSections, setExpandedSections] = useState({ new: true, deleted: true });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const toggleNewTag = (name) => {
        setAcceptedNew(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const toggleDeleteTag = (name) => {
        setAcceptedDeletes(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const selectAllNew = (select) => {
        if (select) {
            setAcceptedNew(new Set(diff.newTags.map(t => t.name)));
        } else {
            setAcceptedNew(new Set());
        }
    };

    const selectAllDeletes = (select) => {
        if (select) {
            setAcceptedDeletes(new Set(diff.deletedTags.map(t => t.name)));
        } else {
            setAcceptedDeletes(new Set());
        }
    };

    const handleConfirm = () => {
        // Filter incoming tags to only accepted new ones + all unchanged (those in both)
        const incomingByName = new Map(incomingTags.map(t => [t.name, t]));
        const currentByName = new Map(currentTags.map(t => [t.name, t]));

        // Start with tags that exist in both (unchanged)
        const resultTags = [];

        // Add unchanged tags (exist in both)
        currentTags.forEach(tag => {
            if (incomingByName.has(tag.name)) {
                // Use incoming version (it may have updated values)
                resultTags.push(incomingByName.get(tag.name));
            }
        });

        // Add accepted new tags
        diff.newTags.forEach(tag => {
            if (acceptedNew.has(tag.name)) {
                resultTags.push(tag);
            }
        });

        // Add rejected deletes (keep them from current)
        diff.deletedTags.forEach(tag => {
            if (!acceptedDeletes.has(tag.name)) {
                // User rejected deletion, keep the tag
                resultTags.push(tag);
            }
        });

        onConfirm(resultTags);
    };

    const styles = {
        row: {
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid #333',
            gap: 12
        },
        checkbox: {
            width: 18,
            height: 18,
            cursor: 'pointer'
        },
        tag: {
            fontFamily: 'monospace',
            fontWeight: 600
        },
        description: {
            opacity: 0.7,
            fontSize: '0.85rem',
            marginLeft: 'auto'
        },
        sectionHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'rgba(0,0,0,0.3)',
            cursor: 'pointer',
            userSelect: 'none',
            borderRadius: 4,
            marginBottom: 4
        }
    };

    const totalChanges = diff.newTags.length + diff.deletedTags.length;
    const acceptedCount = acceptedNew.size + acceptedDeletes.size;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div style={{
                background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
                width: '90%', maxWidth: 900, height: '80%', display: 'flex', flexDirection: 'column',
                boxShadow: '0 10px 40px rgba(0,0,0,0.7)'
            }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Download size={20} /> Import Preview
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 4 }}>
                            {totalChanges} changes detected • {diff.unchangedCount} tags unchanged
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                    {totalChanges === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#4a4' }}>
                            ✓ No changes detected. Grid matches DBF files.
                        </div>
                    ) : (
                        <>
                            {/* NEW TAGS */}
                            {diff.newTags.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <div style={styles.sectionHeader} onClick={() => toggleSection('new')}>
                                        {expandedSections.new ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <Plus size={16} style={{ color: '#4a4' }} />
                                        <span style={{ color: '#4a4', fontWeight: 600 }}>New Tags</span>
                                        <span style={{
                                            background: 'rgba(50, 200, 50, 0.2)',
                                            padding: '2px 8px',
                                            borderRadius: 10,
                                            fontSize: '0.8rem'
                                        }}>
                                            {acceptedNew.size}/{diff.newTags.length} accepted
                                        </span>
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); selectAllNew(true); }}
                                                style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#4a4', cursor: 'pointer' }}
                                            >
                                                Accept All
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); selectAllNew(false); }}
                                                style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#a44', cursor: 'pointer' }}
                                            >
                                                Reject All
                                            </button>
                                        </div>
                                    </div>
                                    {expandedSections.new && (
                                        <div style={{ background: 'rgba(50, 200, 50, 0.05)', borderRadius: 4, border: '1px solid #333' }}>
                                            {diff.newTags.map(tag => (
                                                <div key={tag.name} style={styles.row}>
                                                    <input
                                                        type="checkbox"
                                                        checked={acceptedNew.has(tag.name)}
                                                        onChange={() => toggleNewTag(tag.name)}
                                                        style={styles.checkbox}
                                                    />
                                                    <span style={{ ...styles.tag, color: '#88ff88' }}>+ {tag.name}</span>
                                                    <span style={styles.description}>{tag.description || tag.trend_comment || ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DELETED TAGS */}
                            {diff.deletedTags.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <div style={styles.sectionHeader} onClick={() => toggleSection('deleted')}>
                                        {expandedSections.deleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <Trash2 size={16} style={{ color: '#a44' }} />
                                        <span style={{ color: '#a44', fontWeight: 600 }}>Tags to Remove</span>
                                        <span style={{
                                            background: 'rgba(200, 50, 50, 0.2)',
                                            padding: '2px 8px',
                                            borderRadius: 10,
                                            fontSize: '0.8rem'
                                        }}>
                                            {acceptedDeletes.size}/{diff.deletedTags.length} will be removed
                                        </span>
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); selectAllDeletes(true); }}
                                                style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#a44', cursor: 'pointer' }}
                                            >
                                                Remove All
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); selectAllDeletes(false); }}
                                                style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 3, color: '#4a4', cursor: 'pointer' }}
                                            >
                                                Keep All
                                            </button>
                                        </div>
                                    </div>
                                    {expandedSections.deleted && (
                                        <div style={{ background: 'rgba(200, 50, 50, 0.05)', borderRadius: 4, border: '1px solid #333' }}>
                                            {diff.deletedTags.map(tag => (
                                                <div key={tag.name} style={styles.row}>
                                                    <input
                                                        type="checkbox"
                                                        checked={acceptedDeletes.has(tag.name)}
                                                        onChange={() => toggleDeleteTag(tag.name)}
                                                        style={styles.checkbox}
                                                    />
                                                    <span style={{
                                                        ...styles.tag,
                                                        color: acceptedDeletes.has(tag.name) ? '#ff8888' : '#888',
                                                        textDecoration: acceptedDeletes.has(tag.name) ? 'line-through' : 'none'
                                                    }}>
                                                        − {tag.name}
                                                    </span>
                                                    <span style={styles.description}>{tag.description || ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        {acceptedCount} of {totalChanges} changes will be applied
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={onClose} style={{ minWidth: 100, padding: '8px 16px' }}>Cancel</button>
                        <button
                            className="primary"
                            onClick={handleConfirm}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 160, justifyContent: 'center', padding: '8px 16px' }}
                        >
                            <Check size={16} /> Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportDiffModal;
