
import React, { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useReactTable, getCoreRowModel, getExpandedRowModel, getSortedRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table';
import axios from 'axios';
import { ChevronRight, ChevronDown, Plus, Lock, Unlock, ArrowUpDown, Search } from 'lucide-react';
import TagDetailModal from './TagDetailModal';

const TagGrid = forwardRef(({ project, defaults, templates }, ref) => {
    const [data, setData] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [isLocked, setIsLocked] = useState({});
    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);

    // Modal State
    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useImperativeHandle(ref, () => ({
        getTags: () => data,
        importTags: (tags) => {
            // Helper to mimic backend sanitizer
            const sanitizeAddr = (addr) => {
                if (!addr) return '';
                let processed = addr.replace(/[. -]/g, '_'); // Replace . - space with _
                // Mocking the Hex conversion roughly or just assuming standard _ usage
                // Since this is for matching, strict mimic is hard without full logic.
                // But usually, address in tag name matches the sanitized version.
                // Let's assume the user's "Prefix + _ + Address" logic holds.
                return processed;
            };

            const gridData = tags.map((t, i) => {
                let derivedPrefix = t.NAME || '';
                const rawAddr = t.ADDR || '';

                if (derivedPrefix && rawAddr) {
                    // Try to deduce Prefix by stripping Address from Name
                    // Logic: Name = Prefix + "_" + SanitizedAddr
                    // So we look for the sanitized address at the end of the name.
                    // We try a few variations of sanitization or just fuzzy match

                    // Simple approach: standard replacement
                    const suffix = rawAddr.replace(/[. :]/g, '_'); // Colon also often becomes underscore
                    // Check if name ends with it
                    // Try with and without prepended underscore

                    // Case 1: Name ends with "_" + suffix (The standard pattern)
                    // We need a robust way. Let's try to remove the address part if found at the end.

                    // If we can't perfectly mimic, let's look for the *exact* user instruction:
                    // "Prefix = Tag Name - Plc Addr"
                    // If TagName is "Pump01_Running" and Addr is "Running" -> Prefix "Pump01"

                    // We'll perform a case-insensitive check of the address parts?
                    // Let's just try simple replacement of commonly replaced chars.
                    const simplifiedAddr = rawAddr.replace(/[^a-zA-Z0-9]/g, '_');
                    const pattern = new RegExp(`_?${simplifiedAddr}$`, 'i');

                    // Actually, if simplifiedAddr is "Station01_Level_PV" and Tag is "Prefix_Station01_Level_PV"
                    if (derivedPrefix.toUpperCase().endsWith('_' + simplifiedAddr.toUpperCase())) {
                        derivedPrefix = derivedPrefix.substring(0, derivedPrefix.length - (simplifiedAddr.length + 1));
                    }
                    // If that didn't work, maybe the Address didn't have leading underscore in the match?
                    else if (derivedPrefix.toUpperCase().endsWith(simplifiedAddr.toUpperCase())) {
                        derivedPrefix = derivedPrefix.substring(0, derivedPrefix.length - simplifiedAddr.length);
                    }
                }

                return {
                    id: t.id || `import_${i}`,
                    type: t.type || 'single',

                    // Identification
                    cluster: t.CLUSTER || defaults?.cluster || 'Cluster1',
                    udt_type: t.udt_type || 'Single',
                    name: derivedPrefix, // DEDUCED PREFIX
                    address: t.ADDR || '',
                    citectName: t.NAME || '',

                    // Variable
                    dataType: t.TYPE || 'DIGITAL',
                    engUnits: t.ENG_UNITS || '',
                    engZero: t.ENG_ZERO || '',
                    engFull: t.ENG_FULL || '',
                    format: t.FORMAT || '',
                    description: t.COMMENT || '',

                    // Trend
                    isTrend: t.isTrend === true || t.isTrend === 'True',
                    trendName: t.trendName || (t.isTrend ? t.NAME : ''),
                    samplePeriod: t.SAMPLEPER || '',
                    trendType: t.trendType || 'TRN_PERIODIC',
                    trendTrigger: t.TRIG || '',
                    trendFilename: t.FILENAME || '',
                    trendFiles: t.FILES || '',
                    trendStorage: t.STORMETHOD || '',

                    // Alarm
                    isAlarm: t.isAlarm === true || t.isAlarm === 'True',
                    alarmName: t.alarmName || (t.isAlarm ? (t.TAG || t.NAME + "_Alm") : ''),
                    alarmCategory: t.CATEGORY || '',
                    alarmPriority: t.PRIORITY || '',
                    alarmHelp: t.HELP || '',
                    alarmDelay: t.DELAY || '',
                    alarmArea: t.AREA || '',

                    // Compat
                    equipment: t.EQUIP || '',
                    item: t.ITEM || '',

                    subRows: []
                };
            });
            setData(gridData);
        }
    }));

    // Templates now passed via props from App.jsx
    // useEffect(() => { ... }, []);

    // Mock initial data
    useEffect(() => {
        if (data.length === 0) {
            setData([
                {
                    id: 1, type: 'single',
                    cluster: defaults?.cluster || 'Cluster1',
                    udt_type: 'Single',
                    name: 'FIT101',
                    address: 'Prog:Station01.Level.PV',
                    citectName: 'FIT101_PV',

                    dataType: 'REAL',
                    engUnits: 'kPa',
                    engZero: '0',
                    engFull: '100',
                    format: '###.#',
                    description: 'Flow Transmitter 101',

                    isTrend: false,
                    trendName: 'FIT101_PV',
                    samplePeriod: '',
                    trendType: 'TRN_PERIODIC',
                    trendTrigger: '',

                    isAlarm: false,
                    alarmName: 'FIT101_Alm',
                    alarmCategory: '',
                    alarmPriority: '',

                    equipment: 'FIT101',
                    item: 'Value',

                    subRows: []
                }
            ]);
        }
    }, [defaults]);

    // Expansion Logic
    useEffect(() => {
        const expandedIds = Object.keys(expanded).filter(k => expanded[k]);
        expandedIds.forEach(async (rowIdStr) => {
            const rowIndex = parseInt(rowIdStr);
            const rowData = data[rowIndex];

            if (rowData && rowData.type === 'udt' && (!rowData.subRows || rowData.subRows.length === 0)) {
                try {
                    const res = await axios.post('http://127.0.0.1:8000/api/expand', { ...rowData });
                    // Filter: Only use 'variable' records (which now contain all metadata)
                    const variables = res.data.filter(c => c._tag_type === 'variable');

                    const children = variables.map(c => ({
                        ...c,
                        type: 'child',
                        cluster: c.CLUSTER,
                        udt_type: c._tag_type,
                        name: c.NAME,
                        address: c.ADDR,
                        citectName: c.NAME,

                        dataType: c.TYPE,
                        engUnits: c.ENG_UNITS,
                        engZero: c.ENG_ZERO,
                        engFull: c.ENG_FULL,
                        format: c.FORMAT,
                        description: c.COMMENT,

                        isTrend: c.isTrend,
                        trendName: c.trendName || c.NAME,
                        samplePeriod: c.samplePeriod || c.SAMPLEPER,
                        trendType: c.trendType || (c.SAMPLEPER ? 'TRN_PERIODIC' : ''),
                        trendTrigger: c.trendTrigger || c.TRIG,
                        trendFilename: c.trendFilename || c.FILENAME,

                        isAlarm: c.isAlarm,
                        alarmName: c.alarmName || (c.NAME + "_Alm"),
                        alarmCategory: c.alarmCategory || c.CATEGORY,
                        alarmPriority: c.alarmPriority || c.PRIORITY,
                        alarmHelp: c.alarmHelp || c.HELP,
                        alarmArea: c.alarmArea || c.AREA,

                        equipment: c.EQUIP,
                        item: c.ITEM,
                    }));

                    setData(prev => {
                        const newData = [...prev];
                        // Immutable update of the row
                        newData[rowIndex] = { ...newData[rowIndex], subRows: children };
                        return newData;
                    });
                } catch (e) { console.error("Expand failed", e); }
            }
        });
    }, [expanded, data]);

    // Handlers
    const sanitizeName = async (val) => {
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/sanitize', { text: val });
            return res.data.sanitized;
        } catch { return val; }
    };

    const handlePrefixChange = async (rowIndex, newVal, currentAddr, rowId, type) => {
        setData(prev => {
            const newData = [...prev];
            newData[rowIndex] = { ...newData[rowIndex], name: newVal };
            return newData;
        });

        if (!isLocked[rowId]) {
            const combined = `${newVal}_${currentAddr}`;
            const sanitized = await sanitizeName(combined);
            setData(prev => {
                const newData = [...prev];
                // Check if user has changed it since? No, just overwrite if unlocked.
                newData[rowIndex] = {
                    ...newData[rowIndex],
                    citectName: sanitized,
                    trendName: sanitized,
                    alarmName: sanitized + "_Alm",
                    equipment: sanitized
                };
                return newData;
            });
        }
    };

    const handleAddressChange = async (rowIndex, newVal, currentPrefix, rowId, type) => {
        setData(prev => {
            const newData = [...prev];
            newData[rowIndex] = { ...newData[rowIndex], address: newVal };
            return newData;
        });

        if (!isLocked[rowId]) {
            // If prefix exists, try to combine
            if (currentPrefix) {
                const combined = `${currentPrefix}_${newVal}`;
                const sanitized = await sanitizeName(combined);
                setData(prev => {
                    const newData = [...prev];
                    newData[rowIndex] = {
                        ...newData[rowIndex],
                        citectName: sanitized,
                        trendName: sanitized,
                        alarmName: sanitized + "_Alm",
                        equipment: sanitized
                    };
                    return newData;
                });
            }
        }
    };

    const handleTypeChange = (rowIndex, newType) => {
        setData(prev => {
            const newData = [...prev];
            const row = { ...newData[rowIndex] };

            if (newType === 'Single') {
                row.type = 'single';
                row.udt_type = 'Single';
                row.subRows = []; // Clear any children
            } else {
                row.type = 'udt';
                row.udt_type = newType;
                // Auto-enable Trend and Alarm for UDTs by default
                row.isTrend = true;
                row.isAlarm = true;
                row.subRows = []; // Clear to force re-expansion with new template
            }

            newData[rowIndex] = row;
            return newData;
        });
    };

    const handleFieldChange = (rowIndex, field, val) => {
        setData(prev => {
            const newData = [...prev];
            const row = { ...newData[rowIndex], [field]: val };

            // If UDT, clear subRows to force refresh of preview
            if (row.type === 'udt') {
                row.subRows = [];
                // We might need to trigger a re-fetch if it's currently expanded.
                // The useEffect depends on 'expanded', checking if subRows is empty.
                // So clearing it here should trigger the existing useEffect logic!
            }

            newData[rowIndex] = row;
            return newData;
        });
    }

    const toggleLock = (e, rowId) => {
        e.stopPropagation();
        setIsLocked(prev => ({ ...prev, [rowId]: !prev[rowId] }));
    };

    const handleCheckboxChange = (rowIndex, field, checked) => {
        setData(prev => {
            const newData = [...prev];
            const row = { ...newData[rowIndex], [field]: checked };

            // Pre-fill Defaults
            if (field === 'isTrend' && checked) {
                if (!row.samplePeriod) row.samplePeriod = defaults?.sample_period || '00:00:01';
                if (!row.trendType) row.trendType = defaults?.trend_type || 'TRN_PERIODIC';
                if (!row.trendStorage) row.trendStorage = defaults?.trend_storage || 'Scaled';
                if (!row.trendFiles) row.trendFiles = defaults?.trend_files || '';
                // Default Name
                if (!row.trendName) row.trendName = row.citectName;
            }
            if (field === 'isAlarm' && checked) {
                if (!row.alarmCategory) row.alarmCategory = defaults?.alarm_category || '1';
                if (!row.alarmPriority) row.alarmPriority = defaults?.alarm_priority || '1';
                if (!row.alarmArea) row.alarmArea = defaults?.alarm_area || '';
                if (!row.alarmHelp) row.alarmHelp = defaults?.alarm_help || '';
                // Default Name
                if (!row.alarmName) row.alarmName = row.citectName + "_Alm";
            }

            // If UDT, clear subRows to force refresh of preview logic (Master Switches)
            if (row.type === 'udt') {
                row.subRows = [];
            }

            newData[rowIndex] = row;
            return newData;
        });
    };

    const handleRowDoubleClick = (row) => {
        setEditingRowIndex(row.index);
        setIsDetailOpen(true);
    };

    const handleModalSave = (updatedTag) => {
        if (editingRowIndex !== null) {
            setData(prev => {
                const newData = [...prev];
                newData[editingRowIndex] = updatedTag;
                return newData;
            });
        }
        setIsDetailOpen(false);
    };

    const columns = useMemo(() => [
        {
            id: 'expander',
            header: () => null,
            cell: ({ row }) => (
                row.original.type === 'udt' ? (
                    <button onClick={row.getToggleExpandedHandler()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {row.getIsExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : null
            ),
            size: 30,
            meta: { stickyWith: 0 }
        },
        // --- IDENTIFICATION (Pinned Left) ---
        {
            id: 'id_group',
            header: 'Identification',
            meta: { headerClass: 'group-id' },
            columns: [
                // Project column hidden as per user request
                // {
                //     id: 'project',
                //     header: 'Project',
                //     cell: () => <span style={{ opacity: 0.5 }}>{project?.name || 'Current'}</span>,
                //     size: 80,
                //     meta: { isSticky: true, left: 30 }
                // },
                {
                    accessorKey: 'cluster',
                    header: 'Cluster',
                    cell: ({ getValue, row }) => (
                        row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue() || 'Cluster1'} onChange={(e) => handleFieldChange(row.index, 'cluster', e.target.value)} />
                    ),
                    size: 80,
                    meta: { isSticky: true, left: 30 }
                },
                {
                    accessorKey: 'name',
                    header: 'Prefix',
                    cell: ({ getValue, row }) => (
                        row.original.type === 'child' ? null :
                            <input
                                value={getValue()}
                                onChange={(e) => handlePrefixChange(row.index, e.target.value, row.original.address, row.original.id, row.original.type)}
                            />
                    ),
                    size: 140,
                    meta: { isSticky: true, left: 110 }
                },
                {
                    accessorKey: 'udt_type',
                    header: 'Type',
                    cell: ({ getValue, row }) => {
                        return (
                            <select
                                value={row.original.type === 'single' ? 'Single' : getValue()}
                                onChange={(e) => handleTypeChange(row.index, e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    color: 'var(--accent-color)',
                                    border: 'none',
                                    fontSize: '0.9em',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="Single">Single Tag</option>
                                <optgroup label="UDT Templates">
                                    {templates && Object.keys(templates).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </optgroup>
                            </select>
                        );
                    },
                    size: 100,
                    meta: { isSticky: true, left: 250 }
                },
                {
                    accessorKey: 'address',
                    header: 'PLC Addr',
                    cell: ({ getValue, row }) => (
                        row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input
                                value={getValue()}
                                onChange={(e) => handleAddressChange(row.index, e.target.value, row.original.name, row.original.id, row.original.type)}
                                style={{
                                    border: '1px solid var(--accent-color)',
                                    backgroundColor: 'rgba(0, 255, 127, 0.05)'
                                }}
                            />
                    ),
                    size: 120,
                    meta: { isSticky: true, left: 330, headerStyle: { color: 'var(--accent-color)' } }
                },
                {
                    accessorKey: 'citectName',
                    header: 'Tag Name',
                    cell: ({ getValue, row }) => (
                        row.original.type === 'child' ? <span style={{ fontWeight: 500 }}>{getValue()}</span> :
                            <div style={{ display: 'flex' }}>
                                <input value={getValue()} onChange={(e) => handleFieldChange(row.index, 'citectName', e.target.value)} readOnly={!isLocked[row.original.id]} />
                                <button onClick={(e) => toggleLock(e, row.original.id)} style={{ background: 'none', border: 'none', padding: 0, marginLeft: 2, opacity: 0.5 }}>
                                    {isLocked[row.original.id] ? <Lock size={10} /> : <Unlock size={10} />}
                                </button>
                            </div>
                    ),
                    size: 180,
                    meta: { isSticky: true, left: 450, isSeparated: true } // Border Right
                },
            ]
        },
        // --- VARIABLE ---
        {
            id: 'var_group',
            header: 'Variable Group',
            meta: { headerClass: 'group-variable' },
            columns: [
                {
                    accessorKey: 'dataType',
                    header: 'Data Type',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <select
                                value={getValue()}
                                onChange={(e) => handleFieldChange(row.index, 'dataType', e.target.value)}
                                style={{ width: '100%', background: 'transparent', color: 'inherit', border: 'none' }}
                            >
                                {['BCD', 'BYTE', 'DIGITAL', 'INT', 'LONG', 'LONGBCD', 'REAL', 'STRING', 'UINT', 'ULONG'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                    },
                    size: 80
                },
                {
                    accessorKey: 'engUnits',
                    header: 'Eng Units',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue()} onChange={(e) => handleFieldChange(row.index, 'engUnits', e.target.value)} />
                    },
                    size: 70
                },
                {
                    accessorKey: 'engZero',
                    header: 'Zero',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue()} onChange={(e) => handleFieldChange(row.index, 'engZero', e.target.value)} />
                    },
                    size: 60
                },
                {
                    accessorKey: 'engFull',
                    header: 'Full',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue()} onChange={(e) => handleFieldChange(row.index, 'engFull', e.target.value)} />
                    },
                    size: 60
                },
                {
                    accessorKey: 'format',
                    header: 'Format',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue()} onChange={(e) => handleFieldChange(row.index, 'format', e.target.value)} />
                    },
                    size: 70
                },
                {
                    accessorKey: 'description',
                    header: 'Comment',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue()} onChange={(e) => handleFieldChange(row.index, 'description', e.target.value)} />
                    },
                    size: 200,
                    meta: { isSeparated: true }
                }
            ]
        },
        // --- TREND ---
        {
            id: 'trend_group',
            header: 'Trend Group',
            meta: { headerClass: 'group-trend' },
            columns: [
                {
                    id: 'isTrend',
                    header: 'Trend?',
                    cell: ({ row }) => {
                        return <input
                            type="checkbox"
                            checked={row.original.isTrend || false}
                            disabled={row.original.type === 'child'}
                            onChange={(e) => handleCheckboxChange(row.index, 'isTrend', e.target.checked)}
                            style={{ width: 'auto', opacity: row.original.type === 'child' ? 0.6 : 1 }}
                        />
                    },
                    size: 50
                },
                {
                    accessorKey: 'samplePeriod',
                    header: 'Period',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        // Hide detail if Trend is disabled for this row
                        if (row.original.type === 'child' && !row.original.isTrend) return null;

                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue() || ''} onChange={(e) => handleFieldChange(row.index, 'samplePeriod', e.target.value)} disabled={!row.original.isTrend} />
                    },
                    size: 80
                },
                {
                    accessorKey: 'trendType',
                    header: 'Type',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        if (row.original.type === 'child' && !row.original.isTrend) return null;

                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <select
                                value={getValue() || ''}
                                onChange={(e) => handleFieldChange(row.index, 'trendType', e.target.value)}
                                disabled={!row.original.isTrend}
                                style={{ width: '100%', background: 'transparent', color: 'inherit', border: 'none' }}
                            >
                                <option value="">Select...</option>
                                {['TRN_PERIODIC', 'TRN_EVENT', 'TRN_PERIODIC_EVENT'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                    },
                    size: 120
                },
                {
                    accessorKey: 'trendTrigger',
                    header: 'Trigger',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        if (row.original.type === 'child' && !row.original.isTrend) return null;

                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue() || ''} onChange={(e) => handleFieldChange(row.index, 'trendTrigger', e.target.value)} disabled={!row.original.isTrend} />
                    },
                    size: 150,
                    meta: { isSeparated: true }
                }
            ]
        },
        // --- ALARM ---
        {
            id: 'alarm_group',
            header: 'Alarm Group',
            meta: { headerClass: 'group-alarm' },
            columns: [
                {
                    id: 'isAlarm',
                    header: 'Alarm?',
                    cell: ({ row }) => {
                        return <input
                            type="checkbox"
                            checked={row.original.isAlarm || false}
                            disabled={row.original.type === 'child'}
                            onChange={(e) => handleCheckboxChange(row.index, 'isAlarm', e.target.checked)}
                            style={{ width: 'auto', opacity: row.original.type === 'child' ? 0.6 : 1 }}
                        />
                    },
                    size: 50
                },
                {
                    accessorKey: 'alarmCategory',
                    header: 'Category',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        if (row.original.type === 'child' && !row.original.isAlarm) return null;

                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue() || ''} onChange={(e) => handleFieldChange(row.index, 'alarmCategory', e.target.value)} disabled={!row.original.isAlarm} />
                    },
                    size: 70
                },
                {
                    accessorKey: 'alarmPriority',
                    header: 'Priority',
                    cell: ({ getValue, row }) => {
                        if (row.original.type === 'udt') return <div style={{ background: '#111', width: '100%', height: '100%', opacity: 0.3 }} />;
                        if (row.original.type === 'child' && !row.original.isAlarm) return null;

                        return row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue() || ''} onChange={(e) => handleFieldChange(row.index, 'alarmPriority', e.target.value)} disabled={!row.original.isAlarm} />
                    },
                    size: 70,
                    meta: { isSeparated: true }
                }
            ]
        },
        // --- COMPAT ---
        {
            id: 'group_compat',
            header: 'Forward Compatibility',
            meta: { headerClass: 'group-compat' },
            columns: [
                {
                    accessorKey: 'equipment',
                    header: 'EQUIP',
                    cell: ({ getValue, row }) =>
                        row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue()} onChange={(e) => handleFieldChange(row.index, 'equipment', e.target.value)} />,
                    size: 120
                },
                {
                    accessorKey: 'item',
                    header: 'ITEM',
                    cell: ({ getValue, row }) =>
                        row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                            <input value={getValue()} onChange={(e) => handleFieldChange(row.index, 'item', e.target.value)} />,
                    size: 120
                }
            ]
        }
    ], [isLocked, defaults, project]); // REMOVED 'data' dependency

    const table = useReactTable({
        data,
        columns,
        state: { expanded },
        onExpandedChange: setExpanded,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getRowId: (row, index, parent) => parent ? `${parent.id}.${index}` : index.toString(),
        getSubRows: row => row.subRows,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getRowCanExpand: row => row.original.type === 'udt' || (row.subRows && row.subRows.length > 0),
        autoResetExpanded: false,
    });

    return (
        <div>
            <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                <button onClick={() => {
                    setData([...data, {
                        id: Date.now(), type: 'single',
                        cluster: defaults?.cluster || 'Cluster1',
                        udt_type: 'Single',
                        name: 'New_Tag',
                        address: '', citectName: 'New_Tag',
                        isTrend: false, isAlarm: false,
                        dataType: defaults?.dataType || 'DIGITAL',
                        engUnits: defaults?.engUnits || '',
                        engZero: defaults?.engZero || '',
                        engFull: defaults?.engFull || '',
                        format: defaults?.format || '',
                        description: '',
                        equipment: '', item: 'Value',
                        subRows: []
                    }])
                }}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Add Tag
                </button>
            </div>
            <table className="tag-grid">
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                const isSticky = header.column.columnDef.meta?.isSticky;
                                const left = header.column.columnDef.meta?.left || 0;
                                const isSep = header.column.columnDef.meta?.isSeparated;

                                return (
                                    <th
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        style={{
                                            width: header.getSize(),
                                            left: isSticky ? left : 'auto',
                                            position: isSticky ? 'sticky' : 'relative',
                                            zIndex: isSticky ? 20 : 10,
                                            backgroundColor: 'var(--bg-tertiary)'
                                        }}
                                        className={`${header.column.columnDef.meta?.headerClass || ''} ${isSep ? 'group-separator-right' : ''}`}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div
                                                onClick={header.column.getToggleSortingHandler()}
                                                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', justifyContent: 'space-between' }}
                                            >
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && <ArrowUpDown size={12} style={{ opacity: 0.5 }} />}
                                            </div>
                                            {/* Filters */}
                                            {['citectName', 'address', 'udt_type'].includes(header.column.id) && (
                                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 4px' }}>
                                                    <Search size={10} style={{ marginRight: 4, opacity: 0.5 }} />
                                                    <input
                                                        value={header.column.getFilterValue() || ''}
                                                        onChange={e => header.column.setFilterValue(e.target.value)}
                                                        placeholder="Filter..."
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'inherit',
                                                            fontSize: '0.8em',
                                                            width: '100%',
                                                            outline: 'none'
                                                        }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr
                            key={row.id}
                            className={row.depth > 0 ? "child-row" : ""}
                            style={{ borderLeft: row.depth > 0 ? '4px solid var(--accent-color)' : 'none' }}
                            onDoubleClick={() => handleRowDoubleClick(row)}
                        >
                            {row.getVisibleCells().map(cell => {
                                const isSticky = cell.column.columnDef.meta?.isSticky;
                                const left = cell.column.columnDef.meta?.left || 0;
                                const isSep = cell.column.columnDef.meta?.isSeparated;

                                return (
                                    <td
                                        key={cell.id}
                                        style={{
                                            left: isSticky ? left : 'auto',
                                            position: isSticky ? 'sticky' : 'relative',
                                            zIndex: isSticky ? 10 : 1,
                                            backgroundColor: isSticky ? (row.depth > 0 ? '#1b2633' : 'var(--bg-primary)') : 'inherit'
                                        }}
                                        className={isSep ? 'group-separator-right' : ''}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* DETAIL MODAL */}
            <TagDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                tag={editingRowIndex !== null ? data[editingRowIndex] : null}
                onSave={handleModalSave}
            />
        </div>
    );
});

export default TagGrid;
