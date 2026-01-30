
import React, { useState, useMemo } from 'react';
import { X, Copy, Download } from 'lucide-react';

const DBFPreviewModal = ({ isOpen, onClose, diff }) => {
    if (!isOpen || !diff) return null;

    const [activeTab, setActiveTab] = useState('variable');

    // Reconstruct full tables from Diff (New + Modified + Unchanged)
    // We ignore 'orphaned' as they would be deleted.
    const tables = useMemo(() => {
        const process = (type) => {
            if (!diff[type]) return [];
            const newRecs = diff[type].new || [];
            const modRecs = diff[type].modified || [];
            const uncRecs = diff[type].unchanged || [];
            // Combine and sort by Name/Tag
            const all = [...newRecs, ...modRecs, ...uncRecs];
            return all.sort((a, b) => {
                const keyA = a.NAME || a.TAG || '';
                const keyB = b.NAME || b.TAG || '';
                return keyA.localeCompare(keyB);
            });
        };

        return {
            variable: process('variable'),
            trend: process('trend'),
            digalm: process('digalm')
        };
    }, [diff]);

    const activeData = tables[activeTab] || [];

    const COLUMN_ORDER = {
        variable: [
            'NAME', 'TYPE', 'UNIT', 'ADDR', 'RAW_ZERO', 'RAW_FULL', 'ENG_ZERO', 'ENG_FULL', 'ENG_UNITS', 'FORMAT', 'COMMENT',
            'CLUSTER', 'EQUIP', 'ITEM', 'TAGGENLINK', 'LINKED', 'EDITCODE', 'HISTORIAN', 'CUSTOM1', 'CUSTOM2', 'CUSTOM3', 'CUSTOM4',
            'CUSTOM5', 'CUSTOM6', 'CUSTOM7', 'CUSTOM8', 'WRITEROLES', 'GUID'
        ],
        trend: [
            'NAME', 'EXPR', 'TRIG', 'SAMPLEPER', 'PRIV', 'AREA', 'ENG_UNITS', 'FORMAT', 'FILENAME', 'FILES', 'TIME', 'PERIOD',
            'COMMENT', 'TYPE', 'SPCFLAG', 'LSL', 'USL', 'SUBGRPSIZE', 'XDOUBLEBAR', 'RANGE', 'SDEVIATION',
            'STORMETHOD', 'CLUSTER', 'EQUIP', 'ITEM', 'TAGGENLINK', 'ZS', 'GUID'
        ],
        digalm: [
            'TAG', 'NAME', 'DESC', 'VAR_A', 'VAR_B', 'CATEGORY', 'HELP', 'PRIV', 'AREA', 'COMMENT',
            'SEQUENCE', 'DELAY', 'CUSTOM1', 'CUSTOM2', 'CUSTOM3', 'CUSTOM4', 'CUSTOM5', 'CUSTOM6', 'CUSTOM7', 'CUSTOM8',
            'CLUSTER', 'EQUIP', 'ITEM', 'TAGGENLINK', 'GUID'
        ]
    };

    // Get columns dynamically from first record (or known schema)
    const columns = useMemo(() => {
        if (activeData.length === 0) return [];

        const keys = new Set();
        activeData.forEach(row => Object.keys(row).forEach(k => keys.add(k)));

        const unsorted = Array.from(keys);
        const order = COLUMN_ORDER[activeTab] || [];

        return unsorted.sort((a, b) => {
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [activeData, activeTab]);

    const copyToClipboard = () => {
        const header = columns.join('\t');
        const rows = activeData.map(row => columns.map(c => row[c] || '').join('\t')).join('\n');
        navigator.clipboard.writeText(header + '\n' + rows);
        alert("Copied to clipboard!");
    };

    const downloadCSV = () => {
        const header = columns.join(',');
        const rows = activeData.map(row => columns.map(c => {
            let val = row[c] || '';
            val = String(val).replace(/"/g, '""'); // Escape quotes
            return `"${val}"`;
        }).join(',')).join('\n');

        const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const tabStyle = (id) => ({
        padding: '8px 16px',
        cursor: 'pointer',
        borderBottom: activeTab === id ? '2px solid var(--accent-color)' : '2px solid transparent',
        color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: activeTab === id ? 600 : 400
    });

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
        }}>
            <div style={{
                background: '#1E1E1E', border: '1px solid #333', borderRadius: '8px',
                width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Raw DBF Preview</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={downloadCSV} title="Export CSV"><Download size={16} /> Export</button>
                        <button onClick={copyToClipboard} title="Copy Table"><Copy size={16} /> Copy</button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white' }}><X size={24} /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.2)' }}>
                    <div onClick={() => setActiveTab('variable')} style={tabStyle('variable')}>VARIABLE.DBF ({tables.variable.length})</div>
                    <div onClick={() => setActiveTab('trend')} style={tabStyle('trend')}>TREND.DBF ({tables.trend.length})</div>
                    <div onClick={() => setActiveTab('digalm')} style={tabStyle('digalm')}>DIGALM.DBF ({tables.digalm.length})</div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
                    {activeData.length === 0 ? (
                        <div style={{ padding: 20, fontStyle: 'italic', color: '#666' }}>No records generated for this file.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#252526', zIndex: 10 }}>
                                <tr>
                                    {columns.map(col => (
                                        <th key={col} style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #444', borderRight: '1px solid #333', color: '#ccc' }}>
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeData.map((row, i) => (
                                    <tr key={i} style={{ background: i % 2 === 0 ? '#1e1e1e' : '#252526' }}>
                                        {columns.map(col => (
                                            <td key={col} style={{ padding: '4px 8px', borderRight: '1px solid #333', color: '#aaa' }}>
                                                {row[col]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DBFPreviewModal;
