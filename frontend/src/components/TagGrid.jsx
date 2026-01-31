
import React, { useState, useMemo, useEffect, useImperativeHandle, forwardRef, useCallback, memo } from 'react';
import { useReactTable, getCoreRowModel, getExpandedRowModel, getSortedRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table';
import axios from 'axios';
import { ChevronRight, ChevronDown, Plus, Lock, Unlock, ArrowUpDown, Search, Trash2 } from 'lucide-react';
import TagDetailModal from './TagDetailModal';

// ============================================
// OPTIMIZED INPUT COMPONENT (defined OUTSIDE TagGrid to prevent recreation)
// Uses local state during typing, commits on blur OR after 150ms debounce
// ============================================
const DebouncedInput = memo(({ value: externalValue, onChange, debounceMs = 750, ...props }) => {
    const [localValue, setLocalValue] = useState(externalValue || '');
    const timeoutRef = React.useRef(null);

    // Sync with external value when it changes (but not during active editing)
    useEffect(() => {
        setLocalValue(externalValue || '');
    }, [externalValue]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Debounce the commit to parent
        timeoutRef.current = setTimeout(() => {
            onChange(newValue);
        }, debounceMs);
    };

    const handleBlur = () => {
        // Clear pending debounce and commit immediately on blur
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        onChange(localValue);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <input
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
});

const TagGrid = forwardRef(({ project, defaults, templates }, ref) => {
    const [data, setData] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [isLocked, setIsLocked] = useState({});
    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);

    // Visibility State (Hide Advanced by Default)
    const [columnVisibility, setColumnVisibility] = useState({
        // Advanced Variable fields hidden by default
        rawZero: false, rawFull: false, editCode: false, linked: false, oid: false,
        ref1: false, ref2: false, deadband: false, custom: false, tagGenLink: false,
        historian: false,
        custom1: false, custom2: false, custom3: false, custom4: false,
        custom5: false, custom6: false, custom7: false, custom8: false,
        writeRoles: false, guid: false,

        // Advanced Trend hidden (from TREND.DBF)
        trend_expr: false, trend_trig: false, trend_priv: false, trend_area: false,
        trend_files: false, trend_storage: false, trend_time: false, trend_period: false,
        trend_comment: false, trend_spcflag: false, trend_lsl: false, trend_usl: false,
        trend_subgrpsize: false, trend_xdoublebar: false, trend_range: false,
        trend_sdeviation: false, trend_editcode: false, trend_linked: false,
        trend_deadband: false, trend_eng_zero: false, trend_eng_full: false,
        trend_eng_units: false, trend_format: false,

        // Advanced Alarm hidden (from DIGALM.DBF)
        alarm_name: false, alarm_help: false, alarm_area: false, alarm_priv: false,
        alarm_delay: false, alarm_sequence: false, alarm_var_a: false, alarm_var_b: false,
        alarm_paging: false, alarm_paginggrp: false, alarm_editcode: false,
        alarm_linked: false, alarm_comment: false
    });

    // Modal State
    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useImperativeHandle(ref, () => ({
        getTags: () => data,
        importTags: (tags) => {
            // Updated Import Logic for Full-Fidelity Flat Schema
            // The backend dbf_reader now returns the exact schema we need.
            // We mainly ensuring IDs are unique and types are set.

            // Helper: Sanitize PLC address for comparison
            const sanitize = (addr) => {
                if (!addr) return '';
                let result = '';
                for (let i = 0; i < addr.length; i++) {
                    const char = addr[i];
                    if (/[a-zA-Z0-9_]/.test(char)) {
                        result += char;
                    } else if (char === ':' || char === '.' || char === '[' || char === ']') {
                        result += '_';
                    } else {
                        result += '_' + char.charCodeAt(0).toString(16).toUpperCase() + '_';
                    }
                }
                result = result.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
                return result;
            };

            const gridData = tags.map((t, i) => {
                // Derive plc_addr and prefix from existing data
                const plcAddr = t.plc_addr || t.var_addr || '';
                const tagName = t.name || '';

                // Reverse-engineer prefix: if tagName ends with sanitized(plcAddr), prefix is the remainder
                let prefix = t.prefix || '';
                if (!prefix && plcAddr && tagName) {
                    const sanitizedAddr = sanitize(plcAddr);
                    if (tagName.endsWith(sanitizedAddr)) {
                        prefix = tagName.slice(0, tagName.length - sanitizedAddr.length);
                    }
                }

                return {
                    ...t,
                    id: t.id || `import_${i}_${Date.now()}`,
                    plc_addr: plcAddr, // UI field
                    prefix: prefix,     // Derived prefix
                    // Ensure booleans are actual booleans
                    is_expanded: false, // Collapse by default
                    is_manual_override: t.is_manual_override !== undefined ? t.is_manual_override : true,

                    // Arrays/SubRows
                    subRows: [],

                    // UI State Helpers (if needed)
                    isTrend: t.is_trend,
                    isAlarm: t.is_alarm
                };
            });
            setData(gridData);
        }
    }));

    // Mock initial data - updated keys
    useEffect(() => {
        if (data.length === 0) {
            setData([
                {
                    id: 1,
                    entry_type: 'single',
                    cluster: defaults?.cluster || 'Cluster1',
                    var_unit: 'IODev1',
                    udt_type: 'Single',
                    name: 'FIT101_PV',     // Citect Tag Name
                    var_addr: 'Prog:Station01.Level.PV',

                    type: 'REAL', // Variable Type
                    var_eng_units: 'kPa',
                    var_eng_zero: '0',
                    var_eng_full: '100',
                    var_format: '###.#',
                    description: 'Flow Transmitter 101',

                    is_trend: false,
                    trend_name: 'FIT101_PV',
                    trend_sample_per: '',
                    trend_type: 'TRN_PERIODIC',
                    trend_trig: '',

                    is_alarm: false,
                    alarm_tag: 'FIT101_Alm',
                    alarm_category: '',
                    alarm_priority: '',

                    equipment: 'FIT101',
                    item: 'Value',

                    is_manual_override: false,
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

            // Check if this is a UDT instance (by entry_type OR by having udt_type that's not 'Single')
            const isUdt = rowData && (
                rowData.entry_type === 'udt_instance' ||
                (rowData.udt_type && rowData.udt_type !== 'Single' && rowData.udt_type !== '')
            );

            if (isUdt && (!rowData.subRows || rowData.subRows.length === 0)) {
                try {
                    // Send the full row data to the backend for expansion
                    const res = await axios.post('http://127.0.0.1:8000/api/expand', {
                        ...rowData,
                        entry_type: 'udt_instance' // Ensure backend knows it's a UDT
                    });

                    // API returns { variable: [...], trend: [...], digalm: [...] }
                    const variables = res.data.variable || [];
                    const trends = res.data.trend || [];
                    const alarms = res.data.digalm || [];

                    // Build lookup maps for quick access to full trend/alarm records
                    const trendMap = new Map();
                    trends.forEach(t => trendMap.set(t.NAME || t.EXPR, t));

                    const alarmMap = new Map();
                    alarms.forEach(a => alarmMap.set(a.TAG || a.NAME, a));

                    // Map DBF-style keys (uppercase) to frontend keys (lowercase)
                    const children = variables.map((c, idx) => {
                        const varName = c.NAME || '';
                        const trendData = trendMap.get(varName);
                        const alarmData = alarmMap.get(varName);

                        return {
                            id: `${rowData.id}_member_${idx}`,
                            entry_type: 'member',
                            parent_id: rowData.id,

                            // Map DBF keys to frontend schema
                            name: varName,
                            var_addr: c.ADDR || '',
                            plc_addr: c.ADDR || '',
                            type: c.TYPE || 'DIGITAL',
                            var_unit: c.UNIT || rowData.var_unit || '',
                            var_eng_units: c.ENG_UNITS || '',
                            var_eng_zero: c.ENG_ZERO || '',
                            var_eng_full: c.ENG_FULL || '',
                            var_format: c.FORMAT || '',
                            description: c.COMMENT || '',
                            cluster: c.CLUSTER || rowData.cluster || 'Cluster1',
                            equipment: c.EQUIP || '',
                            item: c.ITEM || '',

                            // Inherit from parent where applicable
                            prefix: rowData.prefix || '',

                            // Determine trend/alarm flags by checking if matching entries exist
                            is_trend: !!trendData,
                            is_alarm: !!alarmData,

                            // Trend fields from backend (if trend exists)
                            trend_name: trendData ? (trendData.NAME || '') : '',
                            trend_expr: trendData ? (trendData.EXPR || varName) : '',
                            trend_sample_per: trendData ? (trendData.SAMPLEPER || '') : '',
                            trend_type: trendData ? (trendData.TYPE || '') : '',
                            trend_filename: trendData ? (trendData.FILENAME || '') : '',
                            trend_storage: trendData ? (trendData.STORMETHOD || '') : '',
                            trend_trig: trendData ? (trendData.TRIGGER || '') : '',
                            trend_area: trendData ? (trendData.AREA || '') : '',
                            trend_priv: trendData ? (trendData.PRIV || '') : '',

                            // Alarm fields from backend (if alarm exists)
                            alarm_tag: alarmData ? (alarmData.TAG || '') : '',
                            alarm_desc: alarmData ? (alarmData.DESC || '') : '',
                            alarm_category: alarmData ? (alarmData.CATEGORY || '') : '',
                            alarm_help: alarmData ? (alarmData.HELP || '') : '',
                            alarm_area: alarmData ? (alarmData.AREA || '') : '',
                            alarm_priv: alarmData ? (alarmData.PRIV || '') : '',
                            alarm_delay: alarmData ? (alarmData.DELAY || '') : '',

                            is_manual_override: false,
                            subRows: []
                        };
                    });

                    setData(prev => {
                        const newData = [...prev];
                        newData[rowIndex] = { ...newData[rowIndex], subRows: children };
                        return newData;
                    });
                } catch (e) {
                    console.error("Expand failed", e);
                }
            }
        });
    }, [expanded, data]);

    // Handlers (Simplified)
    // Sanitization Function for PLC Address -> Tag Name
    const sanitizePlcAddr = (addr) => {
        if (!addr) return '';
        // Replace non-alphanumeric characters with hex equivalents
        let result = '';
        for (let i = 0; i < addr.length; i++) {
            const char = addr[i];
            if (/[a-zA-Z0-9_]/.test(char)) {
                result += char;
            } else if (char === ':' || char === '.' || char === '[' || char === ']') {
                // Common PLC address separators -> underscore
                result += '_';
            } else {
                // Convert to hex
                result += '_' + char.charCodeAt(0).toString(16).toUpperCase() + '_';
            }
        }
        // Remove consecutive underscores
        result = result.replace(/_+/g, '_');
        // Trim leading/trailing underscores
        result = result.replace(/^_+|_+$/g, '');
        return result;
    };

    // Handler for PLC Addr change - auto-generates Tag Name if not manually overridden
    const handlePlcAddrChange = (rowIndex, value) => {
        setData(prev => {
            const newData = [...prev];
            const row = { ...newData[rowIndex] };
            row.plc_addr = value;
            row.var_addr = value; // Also update var_addr for backend

            // Auto-generate name if not overridden
            if (!row.is_manual_override) {
                const prefix = row.prefix || '';
                const sanitized = sanitizePlcAddr(value);
                row.name = prefix + sanitized;
            }
            newData[rowIndex] = row;
            return newData;
        });
    };

    // Handler for Prefix change - auto-generates Tag Name if not manually overridden
    const handlePrefixChange = (rowIndex, value) => {
        setData(prev => {
            const newData = [...prev];
            const row = { ...newData[rowIndex] };
            row.prefix = value;

            // Auto-generate name if not overridden
            if (!row.is_manual_override) {
                const plcAddr = row.plc_addr || row.var_addr || '';
                const sanitized = sanitizePlcAddr(plcAddr);
                row.name = value + sanitized;
            }
            newData[rowIndex] = row;
            return newData;
        });
    };

    const handleCheckboxChange = (rowIndex, field, checked) => {
        setData(prev => {
            const newData = [...prev];
            const row = { ...newData[rowIndex], [field]: checked };

            // Auto-fill trend defaults when is_trend is enabled
            if (field === 'is_trend' && checked && defaults) {
                const tagName = row.name || row.trend_name || '';
                const trendPrefix = defaults.trend_prefix || 'Trends';

                // Auto-generate trend fields from defaults
                row.trend_name = row.trend_name || tagName;
                row.trend_expr = row.trend_expr || tagName;
                row.trend_sample_per = row.trend_sample_per || defaults.sample_period || '1';
                row.trend_type = row.trend_type || defaults.trend_type || 'TRN_PERIODIC';
                row.trend_deadband = row.trend_deadband || defaults.trend_deadband || '';
                row.trend_files = row.trend_files || defaults.trend_numfiles || '25';
                row.trend_time = row.trend_time || defaults.trend_time || '0';
                row.trend_period_rec = row.trend_period_rec || defaults.trend_period || 'Saturday';
                row.trend_storage = row.trend_storage || row.trend_stormethod || defaults.trend_storage || 'Scaled (2-byte samples)';
                row.trend_stormethod = row.trend_storage;

                // Auto-generate filename: [DATA]:{trend_prefix}\{TagName}\{TagName}
                if (!row.trend_filename && tagName) {
                    row.trend_filename = `[DATA]:${trendPrefix}\\${tagName}\\${tagName}`;
                }
            }

            // Clear trend fields when is_trend is unchecked
            if (field === 'is_trend' && !checked) {
                row.trend_name = '';
                row.trend_expr = '';
                row.trend_sample_per = '';
                row.trend_type = '';
                row.trend_deadband = '';
                row.trend_files = '';
                row.trend_time = '';
                row.trend_period_rec = '';
                row.trend_storage = '';
                row.trend_stormethod = '';
                row.trend_filename = '';
                row.trend_trig = '';
            }

            // Auto-fill alarm defaults when is_alarm is enabled
            if (field === 'is_alarm' && checked && defaults) {
                const tagName = row.name || row.alarm_tag || '';
                row.alarm_tag = row.alarm_tag || tagName;
                row.alarm_category = row.alarm_category || defaults.alarm_category || '';
                row.alarm_area = row.alarm_area || defaults.alarm_area || '';
                row.alarm_priv = row.alarm_priv || defaults.alarm_priority || '';
                row.alarm_help = row.alarm_help || defaults.alarm_help || '';
            }

            // Clear alarm fields when is_alarm is unchecked
            if (field === 'is_alarm' && !checked) {
                row.alarm_tag = '';
                row.alarm_desc = '';
                row.alarm_category = '';
                row.alarm_help = '';
                row.alarm_area = '';
                row.alarm_priv = '';
                row.alarm_delay = '';
            }

            newData[rowIndex] = row;
            return newData;
        });
    };

    const handleFieldChange = (rowIndex, field, value) => {
        setData(prev => {
            const newData = [...prev];
            const row = { ...newData[rowIndex], [field]: value };
            newData[rowIndex] = row;
            return newData;
        });
    };

    const handleDeleteRow = (rowIndex) => {
        setData(prev => {
            const row = prev[rowIndex];

            // If it's a UDT instance, also delete all its members (subRows)
            if (row.entry_type === 'udt_instance' && row.subRows?.length > 0) {
                // Get the UDT's name to match members
                const udtName = row.name;
                // Filter out the UDT and any members that belong to it
                return prev.filter((r, i) => {
                    if (i === rowIndex) return false; // Remove the UDT itself
                    // Remove members that belong to this UDT (parent_udt matches)
                    if (r.entry_type === 'member' && r.parent_udt === udtName) return false;
                    return true;
                });
            }

            // For single tags or members, just remove that row
            return prev.filter((_, i) => i !== rowIndex);
        });
    };

    const handleRowDoubleClick = (row) => {
        // Open detail modal for this row
        setEditingRowIndex(row.index);
        setIsDetailOpen(true);
    };

    const handleModalSave = (updatedTag) => {
        if (editingRowIndex !== null) {
            setData(prev => {
                const newData = [...prev];
                newData[editingRowIndex] = { ...newData[editingRowIndex], ...updatedTag };
                return newData;
            });
        }
        setIsDetailOpen(false);
        setEditingRowIndex(null);
    };

    // SimpleInput component - handles UDT instance vs member vs single tag display
    // UDT instances: identification fields are editable, others are disabled/grayed
    // Members: show values (read-only since they're generated from template)
    // Single tags: fully editable
    // OPTIMIZED: Uses local state during typing, commits on blur for performance
    const SimpleInput = ({ getValue, row, field, readOnly, isIdentification = false }) => {
        // Only UDT parent rows (entry_type === 'udt_instance') get disabled cells
        const isUdtParent = row.original.entry_type === 'udt_instance';
        const isMember = row.original.entry_type === 'member';

        // Local state for optimized typing (prevents full grid re-render on each keystroke)
        const [localValue, setLocalValue] = React.useState(getValue() || '');
        const [isFocused, setIsFocused] = React.useState(false);

        // Sync local state when external value changes (e.g., from modal save)
        React.useEffect(() => {
            if (!isFocused) {
                setLocalValue(getValue() || '');
            }
        }, [getValue, isFocused]);

        const handleBlur = () => {
            setIsFocused(false);
            // Only commit if value actually changed
            if (localValue !== (getValue() || '')) {
                handleFieldChange(row.index, field, localValue);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.target.blur(); // Commit on Enter
            }
        };

        // UDT parent: only identification fields are editable
        if (isUdtParent) {
            if (isIdentification) {
                // Identification fields remain editable for UDT instances
                return (
                    <input
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        readOnly={readOnly}
                    />
                );
            } else {
                // Non-identification fields are disabled for UDT instances
                return <div style={{ background: '#1a1a1a', width: '100%', height: '100%', opacity: 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '10px' }}>—</div>;
            }
        }

        // Member rows: display values (generated from template, read-only)
        if (isMember) {
            return <span style={{ opacity: 0.85, paddingLeft: 4 }}>{getValue() || ''}</span>;
        }

        // Single tags: fully editable with optimized local state
        return (
            <input
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                readOnly={readOnly}
            />
        );
    };

    const columns = useMemo(() => [
        {
            id: 'expander',
            header: () => null,
            cell: ({ row }) => (
                row.original.entry_type === 'udt_instance' ? (
                    <button onClick={row.getToggleExpandedHandler()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {row.getIsExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : null
            ),
            size: 30,
            meta: { stickyWith: 0 }
        },
        {
            id: 'delete',
            header: () => null,
            cell: ({ row }) => {
                // Don't show delete for member rows (they're deleted with their parent UDT)
                if (row.original.entry_type === 'member') return null;

                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${row.original.name || 'this row'}"?${row.original.entry_type === 'udt_instance' ? ' This will also delete all members.' : ''}`)) {
                                handleDeleteRow(row.index);
                            }
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 2,
                            cursor: 'pointer',
                            color: '#666',
                            opacity: 0.6,
                            transition: 'opacity 0.15s, color 0.15s'
                        }}
                        onMouseEnter={(e) => { e.target.style.opacity = 1; e.target.style.color = '#e55'; }}
                        onMouseLeave={(e) => { e.target.style.opacity = 0.6; e.target.style.color = '#666'; }}
                        title="Delete row"
                    >
                        <Trash2 size={14} />
                    </button>
                );
            },
            size: 28
        },
        // --- IDENTIFICATION ---
        {
            id: 'id_group',
            header: 'Identification',
            meta: { headerClass: 'group-id' },
            columns: [
                {
                    accessorKey: 'cluster',
                    header: 'Cluster',
                    cell: ({ getValue, row }) => (
                        <DebouncedInput value={getValue() || 'Cluster1'} onChange={(val) => handleFieldChange(row.index, 'cluster', val)} />
                    ),
                    size: 80,
                    meta: { isSticky: true, left: 30 }
                },
                {
                    accessorKey: 'var_unit',
                    header: 'IO Device',
                    cell: ({ getValue, row }) => (
                        <DebouncedInput value={getValue() || ''} onChange={(val) => handleFieldChange(row.index, 'var_unit', val)} />
                    ),
                    size: 100,
                    meta: { isSticky: true, left: 110 }
                },
                {
                    accessorKey: 'prefix',
                    header: 'Prefix',
                    cell: ({ getValue, row }) => (
                        <DebouncedInput
                            value={getValue() || ''}
                            onChange={(val) => handlePrefixChange(row.index, val)}
                            placeholder="e.g. FIT101_"
                            style={{ fontStyle: 'italic', color: '#aaa' }}
                        />
                    ),
                    size: 100,
                    meta: { isSticky: true, left: 210 }
                },
                {
                    accessorKey: 'plc_addr',
                    header: '⭐ PLC Address',
                    cell: ({ getValue, row }) => (
                        <DebouncedInput
                            value={getValue() || row.original.var_addr || ''}
                            onChange={(val) => handlePlcAddrChange(row.index, val)}
                            style={{
                                background: 'var(--accent-color-dim, #1a3a5c)',
                                border: '2px solid var(--accent-color, #4a9eff)',
                                fontWeight: 'bold'
                            }}
                            placeholder="Enter PLC Address..."
                        />
                    ),
                    size: 220,
                    meta: { isSticky: true, left: 310 }
                },
                {
                    accessorKey: 'name',
                    header: 'Tag Name (Generated)',
                    cell: ({ getValue, row }) => (
                        <div style={{ display: 'flex', width: '100%' }}>
                            <DebouncedInput
                                value={getValue()}
                                onChange={(val) => handleFieldChange(row.index, 'name', val)}
                                style={{
                                    border: /^[a-zA-Z0-9_\\/]*$/.test(getValue()) ? '1px solid transparent' : '2px solid red',
                                    fontWeight: row.original.entry_type === 'udt_instance' ? 'bold' : 'normal'
                                }}
                            />
                            {/* Manual Override Lock Icon */}
                            {row.original.entry_type !== 'udt_instance' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCheckboxChange(row.index, 'is_manual_override', !row.original.is_manual_override);
                                    }}
                                    style={{ background: 'none', border: 'none', padding: 0, marginLeft: 4, cursor: 'pointer', color: row.original.is_manual_override ? 'orange' : 'gray' }}
                                    title={row.original.is_manual_override ? "Manual Override ON: Values protected" : "Auto-Generated"}
                                >
                                    {row.original.is_manual_override ? <Lock size={12} /> : <Unlock size={12} />}
                                </button>
                            )}
                        </div>
                    ),
                    size: 200,
                    meta: { isSticky: true, left: 530, isSeparated: true }
                },
                {
                    accessorKey: 'udt_type',
                    header: 'Type',
                    cell: ({ getValue, row }) => {
                        // Simplified selection
                        return (
                            <select
                                value={row.original.entry_type === 'single' ? 'Single' : getValue()}
                                onChange={(e) => {
                                    // Handle Type Change Logic
                                    const val = e.target.value;
                                    setData(prev => {
                                        const d = [...prev];
                                        if (val === 'Single') {
                                            d[row.index].entry_type = 'single';
                                            d[row.index].udt_type = '';
                                        } else {
                                            d[row.index].entry_type = 'udt_instance';
                                            d[row.index].udt_type = val;
                                        }
                                        return d;
                                    });
                                }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)' }}
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
                    size: 120,
                    meta: { isSticky: true, left: 410 }
                },

            ]
        },
        // --- VARIABLE ---
        {
            id: 'var_group',
            header: 'Variable',
            meta: { headerClass: 'group-variable' },
            columns: [
                {
                    accessorKey: 'type',
                    header: 'Data Type',
                    cell: ({ getValue, row }) => {
                        // Only disable for UDT parent rows, NOT for members
                        const isUdtParent = row.original.entry_type === 'udt_instance';
                        if (isUdtParent) return <div style={{ background: '#1a1a1a', opacity: 0.4, textAlign: 'center', color: '#666' }}>—</div>;

                        // Members show value as text (read-only)
                        if (row.original.entry_type === 'member') {
                            return <span style={{ opacity: 0.85, paddingLeft: 4 }}>{getValue() || ''}</span>;
                        }

                        return (
                            <select value={getValue()} onChange={(e) => handleFieldChange(row.index, 'type', e.target.value)} style={{ background: 'transparent', border: 'none', width: '100%', color: 'white' }}>
                                {['DIGITAL', 'INT', 'REAL', 'STRING', 'UINT', 'LONG', 'BYTE'].map(t => <option key={t} value={t} style={{ background: '#333', color: 'white' }}>{t}</option>)}
                            </select>
                        );
                    },
                    size: 90
                },
                { accessorKey: 'var_eng_units', header: 'Eng Units', cell: cellProps => <SimpleInput {...cellProps} field="var_eng_units" />, size: 70 },
                { accessorKey: 'var_eng_zero', header: 'Zero', cell: cellProps => <SimpleInput {...cellProps} field="var_eng_zero" />, size: 60 },
                { accessorKey: 'var_eng_full', header: 'Full', cell: cellProps => <SimpleInput {...cellProps} field="var_eng_full" />, size: 60 },
                { accessorKey: 'var_format', header: 'Format', cell: cellProps => <SimpleInput {...cellProps} field="var_format" />, size: 80 },
                { accessorKey: 'description', header: 'Comment', cell: cellProps => <SimpleInput {...cellProps} field="description" />, size: 200, meta: { isSeparated: true } },
            ]
        },
        // --- TREND ---
        {
            id: 'trend_group',
            header: 'Trend',
            meta: { headerClass: 'group-trend' },
            columns: [
                {
                    id: 'is_trend',
                    header: 'Trend?',
                    cell: ({ row }) => {
                        // Only disable for UDT parent rows
                        const isUdtParent = row.original.entry_type === 'udt_instance';
                        if (isUdtParent) return <div style={{ background: '#1a1a1a', opacity: 0.4, textAlign: 'center', color: '#666' }}>—</div>;

                        // Members show checkbox (read-only indicator)
                        if (row.original.entry_type === 'member') {
                            return <input type="checkbox" checked={!!row.original.is_trend} disabled style={{ opacity: 0.7 }} />;
                        }

                        return <input type="checkbox" checked={row.original.is_trend} onChange={(e) => handleCheckboxChange(row.index, 'is_trend', e.target.checked)} />;
                    },
                    size: 50
                },
                { accessorKey: 'trend_name', header: 'Trend Name', cell: cellProps => <SimpleInput {...cellProps} field="trend_name" />, size: 140 },
                { accessorKey: 'trend_expr', header: 'Expression', cell: cellProps => <SimpleInput {...cellProps} field="trend_expr" />, size: 140 },
                { accessorKey: 'trend_sample_per', header: 'Period', cell: cellProps => <SimpleInput {...cellProps} field="trend_sample_per" />, size: 80 },
                { accessorKey: 'trend_trig', header: 'Trigger', cell: cellProps => <SimpleInput {...cellProps} field="trend_trig" />, size: 100 },
                {
                    accessorKey: 'trend_type',
                    header: 'Type',
                    cell: ({ getValue, row }) => {
                        const isTrend = row.original.is_trend;
                        const val = getValue();
                        // If checking trend, default to TRN_PERIODIC if empty. If unticked, force empty.
                        // But wait, if unticked, we want it visually empty.
                        const displayValue = isTrend ? (val || 'TRN_PERIODIC') : '';

                        return (
                            <select
                                value={displayValue}
                                onChange={(e) => handleFieldChange(row.index, 'trend_type', e.target.value)}
                                style={{ background: 'transparent', border: 'none', width: '100%', color: 'white', opacity: isTrend ? 1 : 0.5 }}
                                disabled={!isTrend}
                            >
                                <option value="" style={{ background: '#333', color: 'white' }}></option>
                                <option value="TRN_EVENT" style={{ background: '#333', color: 'white' }}>TRN_EVENT</option>
                                <option value="TRN_PERIODIC" style={{ background: '#333', color: 'white' }}>TRN_PERIODIC</option>
                                <option value="TRN_PERIODIC_EVENT" style={{ background: '#333', color: 'white' }}>TRN_PERIODIC_EVENT</option>
                            </select>
                        );
                    },
                    size: 140
                },
                { accessorKey: 'trend_filename', header: 'File', cell: cellProps => <SimpleInput {...cellProps} field="trend_filename" />, size: 100 },
                {
                    accessorKey: 'trend_storage',
                    header: 'Storage',
                    cell: ({ getValue, row }) => {
                        const isTrend = row.original.is_trend;
                        return (
                            <select
                                value={getValue() || row.original.trend_stormethod || ''}
                                onChange={(e) => handleFieldChange(row.index, 'trend_storage', e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: isTrend ? 'var(--accent-color)' : '#666', width: '100%' }}
                                disabled={!isTrend}
                            >
                                <option value="" style={{ background: '#333', color: 'white' }}></option>
                                <option value="Scaled (2-byte samples)" style={{ background: '#333', color: 'white' }}>Scaled (2-byte)</option>
                                <option value="Floating point (8-byte samples)" style={{ background: '#333', color: 'white' }}>Floating point (8-byte)</option>
                            </select>
                        );
                    },
                    size: 180
                },
                { accessorKey: 'trend_area', header: 'Area', cell: cellProps => <SimpleInput {...cellProps} field="trend_area" />, size: 60 },
                { accessorKey: 'trend_priv', header: 'Priv', cell: cellProps => <SimpleInput {...cellProps} field="trend_priv" />, size: 60 },
                // Hidden TREND columns (from TREND.DBF)
                { accessorKey: 'trend_eng_units', header: 'Eng Units', cell: cellProps => <SimpleInput {...cellProps} field="trend_eng_units" />, size: 80 },
                { accessorKey: 'trend_format', header: 'Format', cell: cellProps => <SimpleInput {...cellProps} field="trend_format" />, size: 80 },
                { accessorKey: 'trend_files', header: 'Files', cell: cellProps => <SimpleInput {...cellProps} field="trend_files" />, size: 60 },
                { accessorKey: 'trend_time', header: 'Time', cell: cellProps => <SimpleInput {...cellProps} field="trend_time" />, size: 80 },
                { accessorKey: 'trend_period', header: 'Period Rec', cell: cellProps => <SimpleInput {...cellProps} field="trend_period" />, size: 80 },
                { accessorKey: 'trend_comment', header: 'Comment', cell: cellProps => <SimpleInput {...cellProps} field="trend_comment" />, size: 150 },
                { accessorKey: 'trend_spcflag', header: 'SPC Flag', cell: cellProps => <SimpleInput {...cellProps} field="trend_spcflag" />, size: 60 },
                { accessorKey: 'trend_lsl', header: 'LSL', cell: cellProps => <SimpleInput {...cellProps} field="trend_lsl" />, size: 60 },
                { accessorKey: 'trend_usl', header: 'USL', cell: cellProps => <SimpleInput {...cellProps} field="trend_usl" />, size: 60 },
                { accessorKey: 'trend_subgrpsize', header: 'SubGrpSize', cell: cellProps => <SimpleInput {...cellProps} field="trend_subgrpsize" />, size: 80 },
                { accessorKey: 'trend_xdoublebar', header: 'XDoubleBar', cell: cellProps => <SimpleInput {...cellProps} field="trend_xdoublebar" />, size: 80 },
                { accessorKey: 'trend_range', header: 'Range', cell: cellProps => <SimpleInput {...cellProps} field="trend_range" />, size: 60 },
                { accessorKey: 'trend_sdeviation', header: 'SDeviation', cell: cellProps => <SimpleInput {...cellProps} field="trend_sdeviation" />, size: 80 },
                { accessorKey: 'trend_editcode', header: 'Edit Code', cell: cellProps => <SimpleInput {...cellProps} field="trend_editcode" />, size: 80 },
                { accessorKey: 'trend_linked', header: 'Linked', cell: cellProps => <SimpleInput {...cellProps} field="trend_linked" />, size: 60 },
                { accessorKey: 'trend_deadband', header: 'Deadband', cell: cellProps => <SimpleInput {...cellProps} field="trend_deadband" />, size: 80 },
                { accessorKey: 'trend_eng_zero', header: 'Eng Zero', cell: cellProps => <SimpleInput {...cellProps} field="trend_eng_zero" />, size: 80 },
                { accessorKey: 'trend_eng_full', header: 'Eng Full', cell: cellProps => <SimpleInput {...cellProps} field="trend_eng_full" />, size: 80 },
            ]
        },
        // --- ALARM ---
        {
            id: 'alarm_group',
            header: 'Alarm',
            meta: { headerClass: 'group-alarm' },
            columns: [
                {
                    id: 'is_alarm',
                    header: 'Alarm?',
                    cell: ({ row }) => {
                        // Only disable for UDT parent rows
                        const isUdtParent = row.original.entry_type === 'udt_instance';
                        if (isUdtParent) return <div style={{ background: '#1a1a1a', opacity: 0.4, textAlign: 'center', color: '#666' }}>—</div>;

                        // Members show checkbox (read-only indicator)
                        if (row.original.entry_type === 'member') {
                            return <input type="checkbox" checked={!!row.original.is_alarm} disabled style={{ opacity: 0.7 }} />;
                        }

                        return <input type="checkbox" checked={row.original.is_alarm} onChange={(e) => handleCheckboxChange(row.index, 'is_alarm', e.target.checked)} />;
                    },
                    size: 50
                },
                { accessorKey: 'alarm_tag', header: 'Alarm Tag', cell: cellProps => <SimpleInput {...cellProps} field="alarm_tag" />, size: 140 },
                { accessorKey: 'alarm_desc', header: 'Desc', cell: cellProps => <SimpleInput {...cellProps} field="alarm_desc" />, size: 150 },
                { accessorKey: 'alarm_category', header: 'Cat', cell: cellProps => <SimpleInput {...cellProps} field="alarm_category" />, size: 60 },
                { accessorKey: 'alarm_help', header: 'Help', cell: cellProps => <SimpleInput {...cellProps} field="alarm_help" />, size: 120 },
                { accessorKey: 'alarm_area', header: 'Area', cell: cellProps => <SimpleInput {...cellProps} field="alarm_area" />, size: 60 },
                { accessorKey: 'alarm_priv', header: 'Priv', cell: cellProps => <SimpleInput {...cellProps} field="alarm_priv" />, size: 60 },
                { accessorKey: 'alarm_delay', header: 'Delay', cell: cellProps => <SimpleInput {...cellProps} field="alarm_delay" />, size: 60 },
                // Hidden ALARM columns (from DIGALM.DBF)
                { accessorKey: 'alarm_name', header: 'Name', cell: cellProps => <SimpleInput {...cellProps} field="alarm_name" />, size: 140 },
                { accessorKey: 'alarm_var_a', header: 'Var A', cell: cellProps => <SimpleInput {...cellProps} field="alarm_var_a" />, size: 100 },
                { accessorKey: 'alarm_var_b', header: 'Var B', cell: cellProps => <SimpleInput {...cellProps} field="alarm_var_b" />, size: 100 },
                { accessorKey: 'alarm_comment', header: 'Comment', cell: cellProps => <SimpleInput {...cellProps} field="alarm_comment" />, size: 150 },
                { accessorKey: 'alarm_sequence', header: 'Sequence', cell: cellProps => <SimpleInput {...cellProps} field="alarm_sequence" />, size: 80 },
                { accessorKey: 'alarm_paging', header: 'Paging', cell: cellProps => <SimpleInput {...cellProps} field="alarm_paging" />, size: 80 },
                { accessorKey: 'alarm_paginggrp', header: 'Paging Grp', cell: cellProps => <SimpleInput {...cellProps} field="alarm_paginggrp" />, size: 100 },
                { accessorKey: 'alarm_editcode', header: 'Edit Code', cell: cellProps => <SimpleInput {...cellProps} field="alarm_editcode" />, size: 80 },
                { accessorKey: 'alarm_linked', header: 'Linked', cell: cellProps => <SimpleInput {...cellProps} field="alarm_linked" />, size: 60 },
            ]
        },
        // --- COMPAT ---
        {
            id: 'group_compat',
            header: 'Compatibility',
            meta: { headerClass: 'group-compat' },
            columns: [
                { accessorKey: 'equipment', header: 'Equipment', cell: ({ getValue, row }) => <input value={getValue()} onChange={e => handleFieldChange(row.index, 'equipment', e.target.value)} />, size: 120 },
                { accessorKey: 'item', header: 'Item', cell: ({ getValue, row }) => <input value={getValue()} onChange={e => handleFieldChange(row.index, 'item', e.target.value)} />, size: 120 }
            ]
        },
        // --- ADVANCED (Validation/Raw) ---
        {
            id: 'adv_group',
            header: 'Advanced / Raw Data',
            columns: [
                { accessorKey: 'rawZero', header: 'Raw Zero', cell: cellProps => <SimpleInput {...cellProps} field="rawZero" />, size: 80 },
                { accessorKey: 'rawFull', header: 'Raw Full', cell: cellProps => <SimpleInput {...cellProps} field="rawFull" />, size: 80 },
                { accessorKey: 'editCode', header: 'Edit Code', cell: cellProps => <SimpleInput {...cellProps} field="editCode" />, size: 80 },
                { accessorKey: 'linked', header: 'Linked', cell: cellProps => <SimpleInput {...cellProps} field="linked" />, size: 60 },
                { accessorKey: 'oid', header: 'OID', cell: cellProps => <SimpleInput {...cellProps} field="oid" />, size: 80 },
                { accessorKey: 'ref1', header: 'Ref1', cell: cellProps => <SimpleInput {...cellProps} field="ref1" />, size: 80 },
                { accessorKey: 'ref2', header: 'Ref2', cell: cellProps => <SimpleInput {...cellProps} field="ref2" />, size: 80 },
                { accessorKey: 'deadband', header: 'Deadband', cell: cellProps => <SimpleInput {...cellProps} field="deadband" />, size: 80 },
                { accessorKey: 'custom', header: 'Custom', cell: cellProps => <SimpleInput {...cellProps} field="custom" />, size: 100 },
                { accessorKey: 'tagGenLink', header: 'TagGen Link', cell: cellProps => <SimpleInput {...cellProps} field="tagGenLink" />, size: 100 },
                {
                    accessorKey: 'historian',
                    header: 'Historian',
                    cell: ({ getValue, row }) => (
                        <select
                            value={getValue() || ''}
                            onChange={(e) => handleFieldChange(row.index, 'historian', e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', width: '100%' }}
                        >
                            <option value="" style={{ background: '#333', color: 'white' }}></option>
                            <option value="TRUE" style={{ background: '#333', color: 'white' }}>TRUE</option>
                            <option value="FALSE" style={{ background: '#333', color: 'white' }}>FALSE</option>
                        </select>
                    ),
                    size: 100
                },
                { accessorKey: 'writeRoles', header: 'Write Roles', cell: cellProps => <SimpleInput {...cellProps} field="writeRoles" />, size: 100 },
                { accessorKey: 'guid', header: 'GUID', cell: cellProps => <SimpleInput {...cellProps} field="guid" readOnly={true} />, size: 250 },
                // Custom 1-8
                { accessorKey: 'custom1', header: 'Custom 1', cell: cellProps => <SimpleInput {...cellProps} field="custom1" />, size: 80 },
                { accessorKey: 'custom2', header: 'Custom 2', cell: cellProps => <SimpleInput {...cellProps} field="custom2" />, size: 80 },
                { accessorKey: 'custom3', header: 'Custom 3', cell: cellProps => <SimpleInput {...cellProps} field="custom3" />, size: 80 },
                { accessorKey: 'custom4', header: 'Custom 4', cell: cellProps => <SimpleInput {...cellProps} field="custom4" />, size: 80 },
                { accessorKey: 'custom5', header: 'Custom 5', cell: cellProps => <SimpleInput {...cellProps} field="custom5" />, size: 80 },
                { accessorKey: 'custom6', header: 'Custom 6', cell: cellProps => <SimpleInput {...cellProps} field="custom6" />, size: 80 },
                { accessorKey: 'custom7', header: 'Custom 7', cell: cellProps => <SimpleInput {...cellProps} field="custom7" />, size: 80 },
                { accessorKey: 'custom8', header: 'Custom 8', cell: cellProps => <SimpleInput {...cellProps} field="custom8" />, size: 80 },
            ]
        }
    ], [isLocked, project, defaults, templates]); // Removed 'data' - prevents focus loss on keystroke



    const table = useReactTable({
        data,
        columns,
        state: {
            expanded,
            sorting,
            columnFilters,
            columnVisibility // Pass state
        },
        onExpandedChange: setExpanded,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility, // Pass handler
        getRowId: (row, index, parent) => parent ? `${parent.id}.${index}` : index.toString(),
        getSubRows: row => row.subRows,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getRowCanExpand: row => row.original.entry_type === 'udt_instance' || (row.subRows && row.subRows.length > 0),
        autoResetExpanded: false,
    });

    return (
        <div>
            <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                <button onClick={() => {
                    setData([{
                        id: Date.now(),
                        entry_type: 'single', // Explicitly set entry type
                        type: defaults?.type || 'DIGITAL', // SCADA Data Type
                        cluster: defaults?.cluster || 'Cluster1',
                        io_device: defaults?.io_device || '',
                        udt_type: 'Single',
                        name: 'New_Tag',
                        plc_addr: '',
                        var_addr: '', // Ensure var_addr exists
                        prefix: '',
                        isTrend: false, isAlarm: false,
                        engUnits: defaults?.engUnits || '',
                        engZero: defaults?.engZero || '',
                        engFull: defaults?.engFull || '',
                        format: defaults?.format || '',
                        description: '',
                        equipment: '', item: '',
                        subRows: []
                    }, ...data])
                }}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Add Tag
                </button>

                {/* Column Visibility Toggle */}
                <div style={{ position: 'relative', display: 'inline-block', marginLeft: '10px' }}>
                    <button
                        onClick={() => document.getElementById('col-menu').style.display = document.getElementById('col-menu').style.display === 'block' ? 'none' : 'block'}
                        style={{ padding: '0.4rem 0.8rem', background: '#333', border: '1px solid #555', color: '#fff', cursor: 'pointer' }}
                    >
                        Columns ▾
                    </button>
                    <div id="col-menu" style={{
                        display: 'none', position: 'absolute', top: '100%', left: 0,
                        background: '#222', border: '1px solid #444', zIndex: 100,
                        maxHeight: '300px', overflowY: 'auto', width: '250px', padding: '10px'
                    }}>
                        <div style={{ marginBottom: '10px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
                            <button
                                onClick={() => {
                                    setColumnVisibility({
                                        rawZero: false, rawFull: false, editCode: false, linked: false, oid: false,
                                        ref1: false, ref2: false, deadband: false, custom: false, tagGenLink: false,
                                        historian: false,
                                        custom1: false, custom2: false, custom3: false, custom4: false,
                                        custom5: false, custom6: false, custom7: false, custom8: false,
                                        writeRoles: false, guid: false,
                                        spcFlag: false, lsl: false, usl: false, subGrpSize: false, xDoubleBar: false,
                                        range: false, sDeviation: false, paging: false, pagingGrp: false
                                    });
                                }}
                                style={{ width: '100%', padding: '5px', background: '#444', border: 'none', color: '#fff', cursor: 'pointer', marginBottom: '5px' }}
                            >
                                Reset to Default
                            </button>
                            <button
                                onClick={() => table.toggleAllColumnsVisible(true)}
                                style={{ width: '100%', padding: '5px', background: '#444', border: 'none', color: '#fff', cursor: 'pointer' }}
                            >
                                Show All
                            </button>
                        </div>
                        {table.getAllLeafColumns().map(column => {
                            // Skip sticky/core columns if desired, or let user hide everything
                            if (column.id === 'expander' || column.id === 'cluster' || column.id === 'name') return null;
                            return (
                                <div key={column.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '0.9em', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            {...{
                                                type: 'checkbox',
                                                checked: column.getIsVisible(),
                                                onChange: column.getToggleVisibilityHandler(),
                                            }}
                                            style={{ marginRight: '6px' }}
                                        />
                                        {column.columnDef.header}
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>
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
                                            top: 0,
                                            position: 'sticky',
                                            zIndex: isSticky ? 20 : 10,
                                            backgroundColor: 'var(--bg-tertiary)',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
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
                                            {['name', 'plc_addr', 'citectName', 'address', 'udt_type'].includes(header.column.id) && (
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
