
import React, { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useReactTable, getCoreRowModel, getExpandedRowModel, flexRender } from '@tanstack/react-table';
import axios from 'axios';
import { ChevronRight, ChevronDown, Plus, Lock, Unlock, Database } from 'lucide-react';

const TagGrid = forwardRef(({ project, defaults }, ref) => {
    const [data, setData] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [isLocked, setIsLocked] = useState({});
    const [templates, setTemplates] = useState([]);

    // Expose data and Import method
    useImperativeHandle(ref, () => ({
        getTags: () => data,
        importTags: (tags) => {
            // Map imported tags to Grid structure
            const gridData = tags.map((t, i) => ({
                id: t.id || `import_${i}`,
                type: t.type || 'single',
                name: t.NAME || '',
                cluster: t.CLUSTER || defaults?.cluster || 'Cluster1',
                address: t.ADDR || '',
                description: t.COMMENT || '',
                equipment: t.EQUIP || '',
                item: t.ITEM || '',

                // Flags
                isTrend: t.isTrend === true || t.isTrend === 'True',
                isAlarm: t.isAlarm === true || t.isAlarm === 'True',

                // Trend Fields
                samplePeriod: t.SAMPLEPER || (t.isTrend ? (defaults?.sample_period || '00:00:01') : ''),

                // Alarm Fields
                alarmCategory: t.CATEGORY || (t.isAlarm ? (defaults?.alarm_category || '1') : ''),
                alarmPriority: t.PRIORITY || (t.isAlarm ? (defaults?.alarm_priority || '1') : ''),

                subRows: []
            }));
            setData(gridData);
        }
    }));

    // Fetch templates
    useEffect(() => {
        axios.get('http://127.0.0.1:8000/api/templates')
            .then(res => setTemplates(res.data))
            .catch(console.error);
    }, []);

    // Mock initial data if empty
    useEffect(() => {
        if (data.length === 0) {
            setData([
                {
                    id: 1, type: 'single',
                    name: 'Pump_01_Run', cluster: defaults?.cluster || 'Cluster1',
                    address: 'N7:0', description: 'Pump Run Status',
                    equipment: 'Pump_01', item: 'Run',
                    isTrend: false, isAlarm: false,
                    subRows: []
                }
            ]);
        }
    }, [defaults]); // Re-run if defaults load later? Maybe only if data empty.

    // Visibility Logic: Show trend/alarm columns if ANY row has them checked
    const showTrendCols = useMemo(() => data.some(d => d.isTrend), [data]);
    const showAlarmCols = useMemo(() => data.some(d => d.isAlarm), [data]);

    // Handle Expansion - Fetch child rows
    useEffect(() => {
        const expandedIds = Object.keys(expanded).filter(k => expanded[k]);
        expandedIds.forEach(async (rowIdStr) => {
            const rowIndex = parseInt(rowIdStr);
            const rowData = data[rowIndex];

            if (rowData && rowData.type === 'udt' && (!rowData.subRows || rowData.subRows.length === 0)) {
                try {
                    const res = await axios.post('http://127.0.0.1:8000/api/expand', {
                        ...rowData,
                        cluster: rowData.cluster // Pass cluster to expander
                    });
                    const children = res.data.map(c => ({
                        ...c,
                        type: 'child',
                        name: c.NAME || c.TAG,
                        address: c.ADDR || '',
                        description: c.COMMENT || c.DESC,
                        equipment: c.EQUIP,
                        item: c.ITEM
                    }));

                    const newData = [...data];
                    newData[rowIndex].subRows = children;
                    setData(newData);
                } catch (e) {
                    console.error("Failed to expand:", e);
                }
            }
        });
    }, [expanded]);

    // Live Sanitization Hook
    // ... (Code reused from previous, omitted for brevity but assumed present in final file) 
    const sanitizeName = async (val) => {
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/sanitize', { text: val });
            return res.data.sanitized;
        } catch (e) { return val; }
    };

    const handleAddressChange = async (rowIndex, newVal) => {
        const row = data[rowIndex];
        const newData = [...data];
        newData[rowIndex] = { ...row, address: newVal };

        if (!isLocked[row.id]) {
            const sanitized = await sanitizeName(newVal);
            newData[rowIndex].name = sanitized;
            if (row.type === 'single') {
                newData[rowIndex].equipment = sanitized;
                newData[rowIndex].item = 'Value';
            }
        }
        setData(newData);
    };

    const handleNameChange = (rowIndex, newVal) => {
        const newData = [...data];
        newData[rowIndex].name = newVal;
        setData(newData);
    };

    const handleFieldChange = (rowIndex, field, val) => {
        const newData = [...data];
        newData[rowIndex][field] = val;
        setData(newData);
    }

    const toggleLock = (e, rowId) => {
        e.stopPropagation();
        setIsLocked(prev => ({ ...prev, [rowId]: !prev[rowId] }));
    };

    const handleCheckboxChange = (rowIndex, field, checked) => {
        const newData = [...data];
        const row = newData[rowIndex];
        row[field] = checked;

        // Pre-fill Defaults from Props
        if (field === 'isTrend' && checked) {
            if (!row.samplePeriod) row.samplePeriod = defaults?.sample_period || '00:00:01';
        }
        if (field === 'isAlarm' && checked) {
            if (!row.alarmCategory) row.alarmCategory = defaults?.alarm_category || '1';
            if (!row.alarmPriority) row.alarmPriority = defaults?.alarm_priority || '1';
        }

        setData(newData);
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
            size: 30
        },
        {
            accessorKey: 'cluster',
            header: 'Cluster',
            cell: ({ getValue, row }) => (
                row.original.type === 'child' ? null :
                    <input
                        value={getValue() || 'Cluster1'}
                        onChange={(e) => handleFieldChange(row.index, 'cluster', e.target.value)}
                        style={{ color: 'var(--text-secondary)' }}
                    />
            ),
            size: 80
        },
        {
            accessorKey: 'name',
            header: 'Prefix / Tag Name',
            cell: ({ getValue, row }) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {row.original.type === 'child' ? <span>{getValue()}</span> : (
                        <>
                            <input
                                value={getValue()}
                                onChange={(e) => handleNameChange(row.index, e.target.value)}
                                readOnly={!isLocked[row.original.id] && row.original.type !== 'single'}
                                style={{ fontWeight: 500 }}
                            />
                            <button
                                onClick={(e) => toggleLock(e, row.original.id)}
                                title={isLocked[row.original.id] ? "Unlock Sync" : "Lock Manual Name"}
                                style={{ background: 'none', border: 'none', padding: 0, marginLeft: 4, opacity: 0.5 }}
                            >
                                {isLocked[row.original.id] ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                        </>
                    )}
                </div>
            ),
            size: 180
        },
        {
            accessorKey: 'udt_type',
            header: 'Type',
            cell: ({ getValue, row }) => <span style={{ fontSize: '0.8em', color: 'var(--accent-color)' }}>
                {row.original.type === 'udt' ? getValue() : (row.original.type === 'child' ? row.original._tag_type : 'SINGLE')}
            </span>,
            size: 100
        },
        {
            accessorKey: 'address',
            header: 'Address',
            cell: ({ getValue, row }) => (
                row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                    <input
                        value={getValue()}
                        onChange={(e) => handleAddressChange(row.index, e.target.value)}
                        placeholder="N7:0"
                    />
            ),
            size: 100
        },
        {
            id: 'isTrend',
            header: 'Trend',
            cell: ({ row }) => (
                row.original.type === 'child' ? null :
                    <input
                        type="checkbox"
                        checked={row.original.isTrend || false}
                        onChange={(e) => handleCheckboxChange(row.index, 'isTrend', e.target.checked)}
                        style={{ width: 'auto' }}
                    />
            ),
            size: 50
        },
        {
            id: 'isAlarm',
            header: 'Alarm',
            cell: ({ row }) => (
                row.original.type === 'child' ? null :
                    <input
                        type="checkbox"
                        checked={row.original.isAlarm || false}
                        onChange={(e) => handleCheckboxChange(row.index, 'isAlarm', e.target.checked)}
                        style={{ width: 'auto' }}
                    />
            ),
            size: 50
        },
        // --- DYNAMIC TREND FIELDS ---
        {
            accessorKey: 'samplePeriod',
            header: 'Sample Per',
            cell: ({ getValue, row }) => (
                row.original.type === 'child' ? null :
                    <input
                        value={getValue() || ''}
                        onChange={(e) => handleFieldChange(row.index, 'samplePeriod', e.target.value)}
                        disabled={!row.original.isTrend}
                        style={{ opacity: row.original.isTrend ? 1 : 0.3 }}
                    />
            ),
            headerProps: { style: { color: 'var(--text-secondary)' } }
        },
        // --- DYNAMIC ALARM FIELDS ---
        {
            accessorKey: 'alarmCategory',
            header: 'Alm Cat',
            cell: ({ getValue, row }) => (
                row.original.type === 'child' ? null :
                    <input
                        value={getValue() || ''}
                        onChange={(e) => handleFieldChange(row.index, 'alarmCategory', e.target.value)}
                        disabled={!row.original.isAlarm}
                        style={{ opacity: row.original.isAlarm ? 1 : 0.3 }}
                    />
            )
        },
        {
            accessorKey: 'alarmPriority',
            header: 'Alm Prio',
            cell: ({ getValue, row }) => (
                row.original.type === 'child' ? null :
                    <input
                        value={getValue() || ''}
                        onChange={(e) => handleFieldChange(row.index, 'alarmPriority', e.target.value)}
                        disabled={!row.original.isAlarm}
                        style={{ opacity: row.original.isAlarm ? 1 : 0.3 }}
                    />
            )
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ getValue, row }) =>
                row.original.type === 'child' ? <span style={{ opacity: 0.6 }}>{getValue()}</span> :
                    <input value={getValue()} onChange={(e) => handleFieldChange(row.index, 'description', e.target.value)} />,
            size: 200
        },
        {
            id: 'management',
            header: 'Management',
            columns: [
                {
                    accessorKey: 'equipment',
                    header: 'EQUIP',
                    cell: ({ getValue }) => <span style={{ opacity: 0.8, fontFamily: 'monospace' }}>{getValue()}</span>,
                    size: 150
                },
                {
                    accessorKey: 'item',
                    header: 'ITEM',
                    cell: ({ getValue }) => <span style={{ opacity: 0.8, fontFamily: 'monospace' }}>{getValue()}</span>,
                    size: 150
                }
            ]
        }
    ], [data, isLocked, defaults?.sample_period]); // Add defaults dep

    const table = useReactTable({
        data,
        columns,
        state: {
            expanded,
            columnVisibility: {
                samplePeriod: showTrendCols,
                alarmCategory: showAlarmCols,
                alarmPriority: showAlarmCols
            }
        },
        onExpandedChange: setExpanded,
        getSubRows: row => row.subRows,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    });

    return (
        <div>
            <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                <button onClick={() => {
                    setData([...data, {
                        id: Date.now(), type: 'single',
                        name: '', address: '', description: '',
                        equipment: '', item: 'Value', cluster: 'Cluster1',
                        isTrend: false, isAlarm: false,
                        subRows: []
                    }])
                }}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Add Single Tag
                </button>
                <button onClick={() => {
                    const template = templates[0] || 'Motor_Basic';
                    setData([...data, {
                        id: Date.now(), type: 'udt', udt_type: template,
                        name: '', address: '', description: '',
                        equipment: '', item: '', cluster: 'Cluster1',
                        isTrend: false, isAlarm: false,
                        subRows: []
                    }])
                }}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Add UDT Instance
                </button>
            </div>
            <table className="tag-grid">
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} colSpan={header.colSpan} style={{ width: header.getSize() }}>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id} style={{
                            background: row.depth > 0 ? 'rgba(0, 122, 204, 0.05)' : 'transparent', // Slight tint for children
                            borderLeft: row.depth > 0 ? '4px solid var(--accent-color)' : 'none'
                        }}>
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

export default TagGrid;
