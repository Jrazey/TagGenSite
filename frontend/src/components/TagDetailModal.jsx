
import React, { useState, useEffect } from 'react';
import { X, Save, Lock, Unlock } from 'lucide-react';

// --- Form Components (Defined outside to prevent re-renders/focus loss) ---

const Field = ({ label, field, data, onChange, placeholder, width }) => (
    <div style={{ flex: width ? 'none' : 1, width: width, marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
        <input
            value={data[field] || ''}
            onChange={e => onChange(field, e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%', padding: 6, background: '#252526', border: '1px solid #3E3E42',
                color: 'white', borderRadius: 2, fontSize: '0.9rem'
            }}
        />
    </div>
);

const CheckField = ({ label, field, data, onChange }) => (
    <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={!!data[field]} onChange={e => onChange(field, e.target.checked)} />
            <span style={{ fontWeight: 600, color: data[field] ? 'var(--accent-color)' : 'inherit' }}>{label}</span>
        </label>
    </div>
);

const SelectField = ({ label, field, data, onChange, options, width }) => (
    <div style={{ flex: width ? 'none' : 1, width: width, marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
        <select
            value={data[field] || ''}
            onChange={e => onChange(field, e.target.value)}
            style={{
                width: '100%', padding: 6, background: '#252526', border: '1px solid #3E3E42',
                color: 'white', borderRadius: 2, fontSize: '0.9rem', cursor: 'pointer'
            }}
        // Handle trend_storage specific double-update in parent if needed, or generic here? 
        // Better to handle logically in parent's handleChange.
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: '#333', color: 'white' }}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const TagDetailModal = ({ isOpen, onClose, tag, onSave }) => {
    if (!isOpen || !tag) return null;

    const [formData, setFormData] = useState({ ...tag });
    const [activeTab, setActiveTab] = useState('other'); // Default to Shared

    useEffect(() => {
        setFormData({
            ...tag,
            // Ensure cluster has a default value matching grid display
            cluster: tag.cluster || 'Cluster1'
        });
    }, [tag]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };

            // Shared Name Sync
            if (field === 'name') {
                newState.trend_name = value;
                newState.alarm_tag = value;
            }

            return newState;
        });
    };

    const tabs = [
        { id: 'other', label: 'Shared / Identity' },
        { id: 'variable', label: 'Variable.dbf' },
        { id: 'trend', label: 'Trend.dbf' },
        { id: 'digalm', label: 'DigAlm.dbf' }
    ];

    const tabStyle = (id) => ({
        padding: '8px 16px',
        cursor: 'pointer',
        borderBottom: activeTab === id ? '2px solid var(--accent-color)' : '2px solid transparent',
        color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: activeTab === id ? 600 : 400
    });

    const rowStyle = { display: 'flex', gap: 16, marginBottom: 12 };
    const labelStyle = { display: 'block', marginBottom: 4, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = {
        width: '100%', padding: 6, background: '#252526', border: '1px solid #3E3E42',
        color: 'white', borderRadius: 2, fontSize: '0.9rem'
    };


    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
        }}>
            <div style={{
                background: '#1E1E1E', border: '1px solid #333', borderRadius: '4px',
                width: '800px', height: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}>
                {/* Header */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2D2D30' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>TAG CONFIGURATION</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formData.name || 'New Tag'}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#252526', paddingLeft: 12 }}>
                    {tabs.map(t => (
                        <div key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>
                            {t.label}
                        </div>
                    ))}
                </div>

                {/* Content using Grid System */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

                    {/* --- SHARED / IDENTITY TAB --- */}
                    {activeTab === 'other' && (
                        <div>
                            <div style={{ marginBottom: 24, borderBottom: '1px solid #333', paddingBottom: 16 }}>
                                <div style={rowStyle}>
                                    <Field label="Tag Name (Shared)" field="name" data={formData} onChange={handleChange} />
                                    <Field label="Cluster (Shared)" field="cluster" data={formData} onChange={handleChange} />
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginBottom: 12 }}>
                                    * Setting "Tag Name" here updates Variable Name, Trend Name, and Alarm Tag.
                                </div>
                            </div>

                            <div style={rowStyle}>
                                {/* Project is not in grid data usually, check if needed or remove. Keeping for now if passed. */}
                                <Field label="Udt Type" field="udt_type" data={formData} onChange={handleChange} />
                            </div>

                        </div>
                    )}

                    {/* --- VARIABLE TAB --- */}
                    {activeTab === 'variable' && (
                        <>
                            {/* Removed Name & Cluster */}
                            <div style={rowStyle}>
                                <Field label="Address" field="var_addr" data={formData} onChange={handleChange} />
                                <Field label="Data Type" field="type" data={formData} onChange={handleChange} />
                                <Field label="I/O Device" field="var_unit" data={formData} onChange={handleChange} />
                            </div>
                            <div style={rowStyle}>
                                <Field label="Eng Units" field="var_eng_units" data={formData} onChange={handleChange} />
                                <Field label="Format" field="var_format" data={formData} onChange={handleChange} />
                                <Field label="Deadband" field="deadband" data={formData} onChange={handleChange} />
                            </div>
                            <div style={rowStyle}>
                                <Field label="Raw Zero" field="var_raw_zero" data={formData} onChange={handleChange} />
                                <Field label="Raw Full" field="var_raw_full" data={formData} onChange={handleChange} />
                                <Field label="Eng Zero" field="var_eng_zero" data={formData} onChange={handleChange} />
                                <Field label="Eng Full" field="var_eng_full" data={formData} onChange={handleChange} />
                            </div>
                            <div style={rowStyle}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Comment</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={e => handleChange('description', e.target.value)}
                                        style={{ ...inputStyle, height: 60 }}
                                    />
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 8 }}>
                                <label style={{ ...labelStyle, marginBottom: 12 }}>Advanced Variable Settings</label>
                                <div style={rowStyle}>
                                    <Field label="Equipment" field="equipment" data={formData} onChange={handleChange} />
                                    <Field label="Item" field="item" data={formData} onChange={handleChange} />
                                    <Field label="TagGen Link" field="taggenlink" data={formData} onChange={handleChange} />
                                </div>
                                <div style={rowStyle}>
                                    <Field label="Linked" field="linked" data={formData} onChange={handleChange} />
                                    <Field label="Edit Code" field="editcode" data={formData} onChange={handleChange} />
                                    <Field label="Historian" field="historian" data={formData} onChange={handleChange} />
                                </div>
                                <div style={rowStyle}>
                                    <Field label="OID" field="oid" data={formData} onChange={handleChange} />
                                    <Field label="Ref1" field="ref1" data={formData} onChange={handleChange} />
                                    <Field label="Ref2" field="ref2" data={formData} onChange={handleChange} />
                                </div>
                                <div style={rowStyle}>
                                    <Field label="Custom" field="custom" data={formData} onChange={handleChange} />
                                    <Field label="Write Roles" field="write_roles" data={formData} onChange={handleChange} />
                                    <Field label="GUID" field="guid" data={formData} onChange={handleChange} />
                                </div>
                                <div style={rowStyle}>
                                    <Field label="Custom 1" field="custom1" data={formData} onChange={handleChange} />
                                    <Field label="Custom 2" field="custom2" data={formData} onChange={handleChange} />
                                    <Field label="Custom 3" field="custom3" data={formData} onChange={handleChange} />
                                    <Field label="Custom 4" field="custom4" data={formData} onChange={handleChange} />
                                </div>
                                <div style={rowStyle}>
                                    <Field label="Custom 5" field="custom5" data={formData} onChange={handleChange} />
                                    <Field label="Custom 6" field="custom6" data={formData} onChange={handleChange} />
                                    <Field label="Custom 7" field="custom7" data={formData} onChange={handleChange} />
                                    <Field label="Custom 8" field="custom8" data={formData} onChange={handleChange} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- TREND TAB --- */}
                    {activeTab === 'trend' && (
                        <>
                            <CheckField label="Enable Trending" field="is_trend" data={formData} onChange={handleChange} />

                            {formData.is_trend ? (
                                <>
                                    {/* Removed Name, Cluster */}
                                    <div style={rowStyle}>
                                        <Field label="Expression" field="trend_expr" data={formData} onChange={handleChange} />
                                        <Field label="Trigger" field="trend_trig" data={formData} onChange={handleChange} />
                                    </div>
                                    <div style={rowStyle}>
                                        <Field label="Sample Period" field="trend_sample_per" data={formData} onChange={handleChange} />
                                        <Field label="Type" field="trend_type" data={formData} onChange={handleChange} />
                                    </div>
                                    <div style={rowStyle}>
                                        <Field label="Privilege" field="trend_priv" data={formData} onChange={handleChange} />
                                        <Field label="Area" field="trend_area" data={formData} onChange={handleChange} />
                                    </div>
                                    <div style={rowStyle}>
                                        <Field label="Comment" field="trend_comment" data={formData} onChange={handleChange} />
                                    </div>

                                    <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 8, marginBottom: 16 }}>
                                        <label style={labelStyle}>Storage & History</label>
                                    </div>

                                    <div style={rowStyle}>
                                        <Field label="File Name" field="trend_filename" data={formData} onChange={handleChange} />
                                        <Field label="No. Files" field="trend_files" data={formData} onChange={handleChange} />
                                        <Field label="Time" field="trend_time" data={formData} onChange={handleChange} />
                                        <Field label="Period" field="trend_period" data={formData} onChange={handleChange} />
                                    </div>
                                    <div style={rowStyle}>
                                        <SelectField
                                            label="Storage Method"
                                            field="trend_stormethod"
                                            data={formData}
                                            onChange={handleChange}
                                            options={[
                                                { value: '', label: '' },
                                                { value: 'Scaled (2-byte samples)', label: 'Scaled (2-byte samples)' },
                                                { value: 'Floating point (8-byte samples)', label: 'Floating point (8-byte samples)' }
                                            ]}
                                        />
                                    </div>

                                    <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 8 }}>
                                        <label style={{ ...labelStyle, marginBottom: 12 }}>Advanced Trend Settings</label>
                                        <div style={rowStyle}>
                                            <Field label="Eng Units" field="trend_eng_units" data={formData} onChange={handleChange} />
                                            <Field label="Format" field="trend_format" data={formData} onChange={handleChange} />
                                        </div>
                                        <div style={rowStyle}>
                                            <Field label="Eng Zero" field="trend_eng_zero" data={formData} onChange={handleChange} />
                                            <Field label="Eng Full" field="trend_eng_full" data={formData} onChange={handleChange} />
                                            <Field label="Deadband" field="trend_deadband" data={formData} onChange={handleChange} />
                                        </div>
                                        <div style={rowStyle}>
                                            <Field label="Edit Code" field="trend_editcode" data={formData} onChange={handleChange} />
                                            <Field label="Linked" field="trend_linked" data={formData} onChange={handleChange} />
                                        </div>
                                        <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 8 }}>
                                            <label style={{ ...labelStyle, marginBottom: 8 }}>SPC Settings</label>
                                        </div>
                                        <div style={rowStyle}>
                                            <Field label="SPC Flag" field="trend_spcflag" data={formData} onChange={handleChange} />
                                            <Field label="LSL" field="trend_lsl" data={formData} onChange={handleChange} />
                                            <Field label="USL" field="trend_usl" data={formData} onChange={handleChange} />
                                        </div>
                                        <div style={rowStyle}>
                                            <Field label="SubGrpSize" field="trend_subgrpsize" data={formData} onChange={handleChange} />
                                            <Field label="XDoubleBar" field="trend_xdoublebar" data={formData} onChange={handleChange} />
                                            <Field label="Range" field="trend_range" data={formData} onChange={handleChange} />
                                            <Field label="SDeviation" field="trend_sdeviation" data={formData} onChange={handleChange} />
                                        </div>
                                    </div>
                                </>
                            ) : <div style={{ opacity: 0.5 }}>Check "Enable Trending" to configure.</div>}
                        </>
                    )}

                    {/* --- ALARM TAB --- */}
                    {activeTab === 'digalm' && (
                        <>
                            <CheckField label="Enable Alarm" field="is_alarm" data={formData} onChange={handleChange} />

                            {formData.is_alarm ? (
                                <>
                                    {/* Removed TagName */}
                                    <div style={rowStyle}>
                                        <Field label="Alarm Tag" field="alarm_tag" data={formData} onChange={handleChange} />
                                        <Field label="Alarm Name (Desc)" field="alarm_desc" data={formData} onChange={handleChange} />
                                        <Field label="Category" field="alarm_category" data={formData} onChange={handleChange} />
                                    </div>
                                    <div style={rowStyle}>
                                        <Field label="Var A" field="alarm_var_a" data={formData} onChange={handleChange} />
                                        <Field label="Var B" field="alarm_var_b" data={formData} onChange={handleChange} />
                                    </div>

                                    <div style={rowStyle}>
                                        <Field label="Area" field="alarm_area" data={formData} onChange={handleChange} />
                                        <Field label="Privilege" field="alarm_priv" data={formData} onChange={handleChange} />
                                        <Field label="Delay" field="alarm_delay" data={formData} onChange={handleChange} />
                                    </div>

                                    <div style={rowStyle}>
                                        <Field label="Help Msg" field="alarm_help" data={formData} onChange={handleChange} />
                                    </div>

                                    <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 8 }}>
                                        <label style={{ ...labelStyle, marginBottom: 12 }}>Advanced Alarm Settings</label>
                                        <div style={rowStyle}>
                                            <Field label="Name" field="alarm_name" data={formData} onChange={handleChange} />
                                            <Field label="Comment" field="alarm_comment" data={formData} onChange={handleChange} />
                                        </div>
                                        <div style={rowStyle}>
                                            <Field label="Sequence" field="alarm_sequence" data={formData} onChange={handleChange} />
                                            <Field label="Paging" field="alarm_paging" data={formData} onChange={handleChange} />
                                            <Field label="Paging Grp" field="alarm_paginggrp" data={formData} onChange={handleChange} />
                                        </div>
                                        <div style={rowStyle}>
                                            <Field label="Edit Code" field="alarm_editcode" data={formData} onChange={handleChange} />
                                            <Field label="Linked" field="alarm_linked" data={formData} onChange={handleChange} />
                                        </div>
                                    </div>
                                </>
                            ) : <div style={{ opacity: 0.5 }}>Check "Enable Alarm" to configure.</div>}
                        </>
                    )}

                </div>

                {/* Footer */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#2D2D30' }}>
                    <button onClick={onClose} style={{ minWidth: 80, padding: '8px 16px', borderRadius: 4, border: '1px solid #444', background: 'transparent', color: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button className="primary" onClick={() => onSave(formData)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagDetailModal;
