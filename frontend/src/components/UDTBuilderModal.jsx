import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Save, Edit2 } from 'lucide-react';
import UDTMemberDetailModal from './UDTMemberDetailModal';

const UDTBuilderModal = ({ isOpen, onClose }) => {
    const [templates, setTemplates] = useState({});
    const [selectedTemplateName, setSelectedTemplateName] = useState('');
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [statusMsg, setStatusMsg] = useState('');

    // Member Editing State
    const [editingMemberIndex, setEditingMemberIndex] = useState(null); // Index of member being edited
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/templates/detail');
            setTemplates(res.data);
            if (!selectedTemplateName && Object.keys(res.data).length > 0) {
                selectTemplate(Object.keys(res.data)[0], res.data);
            }
        } catch (e) { console.error(e); }
    };

    const selectTemplate = (name, list = templates) => {
        setSelectedTemplateName(name);
        setCurrentTemplate(JSON.parse(JSON.stringify(list[name])));
    };

    const handleCreateNew = () => {
        const name = prompt("Enter new UDT Name (e.g. 'Valve_Control'):");
        if (name) {
            const newT = { description: '', members: [] };
            setTemplates(prev => ({ ...prev, [name]: newT }));
            setSelectedTemplateName(name);
            setCurrentTemplate(newT);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete template '${selectedTemplateName}'?`)) return;
        try {
            await axios.delete(`http://127.0.0.1:8000/api/templates/${selectedTemplateName}`);
            const newTemps = { ...templates };
            delete newTemps[selectedTemplateName];
            setTemplates(newTemps);
            if (Object.keys(newTemps).length > 0) {
                selectTemplate(Object.keys(newTemps)[0], newTemps);
            } else {
                setSelectedTemplateName('');
                setCurrentTemplate(null);
            }
        } catch (e) { alert("Failed to delete"); }
    };

    const handleSave = async () => {
        if (!currentTemplate) return;
        try {
            setStatusMsg('Saving...');
            await axios.post('http://127.0.0.1:8000/api/templates', {
                name: selectedTemplateName,
                description: currentTemplate.description,
                members: currentTemplate.members
            });
            setStatusMsg('Saved!');
            setTimeout(() => setStatusMsg(''), 2000);
            fetchTemplates(); // Refresh
        } catch (e) {
            console.error(e);
            setStatusMsg('Error Saving');
        }
    };

    const updateMember = (index, field, value) => {
        setCurrentTemplate(prev => {
            const newMems = [...prev.members];
            newMems[index] = { ...newMems[index], [field]: value };
            return { ...prev, members: newMems };
        });
    };

    const handleMemberUpdate = (updatedMember) => {
        if (editingMemberIndex === null) return;
        setCurrentTemplate(prev => {
            const newMems = [...prev.members];
            newMems[editingMemberIndex] = updatedMember;
            return { ...prev, members: newMems };
        });
    };

    const addMember = () => {
        setCurrentTemplate(prev => ({
            ...prev,
            members: [...prev.members, {
                suffix: '.New', type: 'DIGITAL', address_offset: '.Status',
                comment_template: '{parent_desc} Status', is_trend: false, is_alarm: false
            }]
        }));
    };

    const removeMember = (index) => {
        setCurrentTemplate(prev => ({
            ...prev,
            members: prev.members.filter((_, i) => i !== index)
        }));
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300
        }}>
            <div style={{
                background: '#1E1E1E', border: '1px solid #333', borderRadius: '8px',
                width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}>
                {/* Header */}
                <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#252526' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>UDT Template Builder</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}><X /></button>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Sidebar */}
                    <div style={{ width: 250, borderRight: '1px solid #333', background: '#2D2D30', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: 12, borderBottom: '1px solid #333' }}>
                            <button onClick={handleCreateNew} className="primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 8 }}>
                                <Plus size={16} /> New Template
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {Object.keys(templates).map(name => (
                                <div
                                    key={name}
                                    onClick={() => selectTemplate(name)}
                                    style={{
                                        padding: '10px 16px', cursor: 'pointer',
                                        background: selectedTemplateName === name ? '#37373D' : 'transparent',
                                        borderLeft: selectedTemplateName === name ? '4px solid var(--accent-color)' : '4px solid transparent'
                                    }}
                                >
                                    {name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {currentTemplate ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                    <div style={{ flex: 1 }}>
                                        <h2 style={{ margin: 0, marginBottom: 8 }}>{selectedTemplateName}</h2>
                                        <input
                                            value={currentTemplate.description}
                                            onChange={e => setCurrentTemplate(p => ({ ...p, description: e.target.value }))}
                                            placeholder="Description..."
                                            style={{ width: '100%', padding: 8, background: '#111', border: '1px solid #444', color: 'white' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <button onClick={handleDelete} className="danger" title="Delete Template"><Trash2 size={20} /></button>
                                        <button onClick={handleSave} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Save size={18} /> Save Changes
                                        </button>
                                    </div>
                                </div>

                                {/* Members Table */}
                                <div style={{ flex: 1, overflow: 'auto', border: '1px solid #333', borderRadius: 4 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: '#252526', position: 'sticky', top: 0 }}>
                                            <tr>
                                                <th style={{ padding: 8, textAlign: 'left' }}>Suffix (Tag Name)</th>
                                                <th style={{ padding: 8, textAlign: 'left' }}>Data Type</th>
                                                <th style={{ padding: 8, textAlign: 'left' }}>Offset (Address)</th>
                                                <th style={{ padding: 8, textAlign: 'left' }}>Comment Template</th>
                                                <th style={{ padding: 8, textAlign: 'center' }}>Trend</th>
                                                <th style={{ padding: 8, textAlign: 'center' }}>Alarm</th>
                                                <th style={{ padding: 8, textAlign: 'center' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentTemplate.members.map((m, i) => (
                                                <tr
                                                    key={i}
                                                    style={{ borderBottom: '1px solid #333', cursor: 'dbl-click' }}
                                                    onDoubleClick={() => {
                                                        setEditingMemberIndex(i);
                                                        setIsDetailOpen(true);
                                                    }}
                                                    title="Double-click for details"
                                                >
                                                    <td style={{ padding: 4 }}><input value={m.suffix} onChange={e => updateMember(i, 'suffix', e.target.value)} style={inputStyle} /></td>
                                                    <td style={{ padding: 4 }}>
                                                        <select value={m.type} onChange={e => updateMember(i, 'type', e.target.value)} style={inputStyle}>
                                                            {['DIGITAL', 'INT', 'REAL', 'STRING'].map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: 4 }}><input value={m.address_offset} onChange={e => updateMember(i, 'address_offset', e.target.value)} style={inputStyle} /></td>
                                                    <td style={{ padding: 4 }}><input value={m.comment_template} onChange={e => updateMember(i, 'comment_template', e.target.value)} style={inputStyle} /></td>
                                                    <td style={{ textAlign: 'center' }}><input type="checkbox" checked={m.is_trend} onChange={e => updateMember(i, 'is_trend', e.target.checked)} /></td>
                                                    <td style={{ textAlign: 'center' }}><input type="checkbox" checked={m.is_alarm} onChange={e => updateMember(i, 'is_alarm', e.target.checked)} /></td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingMemberIndex(i);
                                                                setIsDetailOpen(true);
                                                            }}
                                                            style={{ marginRight: 8, background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => removeMember(i)} style={{ background: 'none', border: 'none', color: '#fa5252', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr>
                                                <td colSpan={7} style={{ padding: 8, textAlign: 'center' }}>
                                                    <button onClick={addMember} className="secondary" style={{ width: '100%' }}>+ Add Member</button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: 8, fontSize: '0.9rem', color: statusMsg.includes('Error') ? 'red' : 'lightgreen' }}>{statusMsg}</div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                                Select or Create a Template
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <UDTMemberDetailModal
                isOpen={isDetailOpen}
                member={currentTemplate?.members[editingMemberIndex]}
                onClose={() => setIsDetailOpen(false)}
                onSave={handleMemberUpdate}
            />
        </div>
    );
};

const inputStyle = {
    width: '100%', padding: 6, background: 'transparent', border: 'none', color: 'white', borderBottom: '1px solid #444'
};

export default UDTBuilderModal;
