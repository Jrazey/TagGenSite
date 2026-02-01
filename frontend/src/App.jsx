
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import TagGrid from './components/TagGrid'
import DiffModal from './components/DiffModal'
import ImportDiffModal from './components/ImportDiffModal'
import SettingsModal from './components/SettingsModal'
import DBFPreviewModal from './components/DBFPreviewModal'
import UDTBuilderModal from './components/UDTBuilderModal'
import { Settings, Download, Eye, Database, Moon, Sun } from 'lucide-react'
import './index.css'

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [diff, setDiff] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Import preview state
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importIncomingTags, setImportIncomingTags] = useState([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUDTBuilderOpen, setIsUDTBuilderOpen] = useState(false);
  const [templates, setTemplates] = useState({});
  const [defaults, setDefaults] = useState(null);

  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Ref to access tag data from TagGrid
  const gridRef = useRef();

  useEffect(() => {
    // Fetch projects and restore last opened
    const init = async () => {
      try {
        const [projRes, settingsRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/projects'),
          axios.get('http://127.0.0.1:8000/api/settings') // Global settings
        ]);

        setProjects(projRes.data);

        const savedPath = settingsRes.data.last_opened_project;
        const target = projRes.data.find(p => p.path === savedPath);

        if (target) {
          setSelectedProject(target);
        } else if (projRes.data.length > 0) {
          setSelectedProject(projRes.data[0]);
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      }
    };
    init();
  }, []);

  // Fetch Defaults
  useEffect(() => {
    if (selectedProject) {
      fetchDefaults(selectedProject.path);
    } else {
      setDefaults({});
    }
  }, [selectedProject]);

  const fetchDefaults = (projPath) => {
    if (!projPath) {
      if (!selectedProject) return;
      projPath = selectedProject.path;
    }
    axios.get(`http://127.0.0.1:8000/api/settings?project_path=${encodeURIComponent(projPath)}`)
      .then(res => setDefaults(res.data))
      .catch(console.error);
  }

  // Fetch Templates (for TagGrid dropdown)
  useEffect(() => {
    fetchTemplates();
  }, [isUDTBuilderOpen]);

  const fetchTemplates = () => {
    axios.get('http://127.0.0.1:8000/api/templates/detail')
      .then(res => setTemplates(res.data))
      .catch(console.error);
  };

  /* State Loading Logic */
  useEffect(() => {
    if (selectedProject && gridRef.current) {
      loadProjectState(selectedProject.path);
    }
  }, [selectedProject]);

  const loadProjectState = async (path) => {
    if (!gridRef.current) return;
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/state?path=${encodeURIComponent(path)}`);
      if (res.data.found && res.data.tags && res.data.tags.length > 0) {
        console.log("Loaded state from DB");
        gridRef.current.importTags(res.data.tags);
      } else {
        // No saved state - reset to default empty row
        console.log("No saved state, resetting to default");
        gridRef.current.importTags([]);
      }
    } catch (e) {
      console.error("Failed to load state", e);
      // On error, also reset to avoid stale data
      gridRef.current.importTags([]);
    }
  };

  const handleSave = async () => {
    if (!gridRef.current || !selectedProject) return;
    const tags = gridRef.current.getTags();
    try {
      await axios.post('http://127.0.0.1:8000/api/save_tags', {
        project_path: selectedProject.path,
        tags: tags
      });
      alert("Project saved to database.");
    } catch (e) {
      console.error("Save failed:", e);
      alert("Save failed.");
    }
  };

  const generateData = async () => {
    // 1. Get tags from grid
    if (!gridRef.current) return null;
    const tags = gridRef.current.getTags();

    if (!selectedProject) {
      alert("Please select a project.");
      return null;
    }

    try {
      // 2. Send to backend
      const res = await axios.post('http://127.0.0.1:8000/api/generate', {
        project_path: selectedProject.path,
        tags: tags
      });
      return res.data.diff;
    } catch (err) {
      console.error("Analysis Failed:", err);
      alert("Analysis failed. Check console.");
      return null;
    }
  };

  const handleGenerate = async () => {
    const generatedDiff = await generateData();
    if (generatedDiff) {
      setDiff(generatedDiff);
      setIsModalOpen(true);
    }
  };

  const handlePreview = async () => {
    const generatedDiff = await generateData();
    if (generatedDiff) {
      setDiff(generatedDiff);
      setIsPreviewOpen(true);
    }
  };

  const handleImport = async () => {
    if (!selectedProject) return;

    try {
      const res = await axios.post('http://127.0.0.1:8000/api/import', {
        project_path: selectedProject.path
      });

      // Store incoming tags and show preview modal
      setImportIncomingTags(res.data);
      setIsImportPreviewOpen(true);
    } catch (e) {
      console.error("Import failed:", e);
      alert("Import failed. Check console.");
    }
  };

  const handleImportConfirm = (resultTags) => {
    if (gridRef.current) {
      gridRef.current.importTags(resultTags);
    }
    setIsImportPreviewOpen(false);
    setImportIncomingTags([]);
  };

  const confirmWrite = async (filteredDiff) => {
    if (!selectedProject || !filteredDiff) return;

    try {
      await axios.post('http://127.0.0.1:8000/api/write', {
        project_path: selectedProject.path,
        diff: filteredDiff
      });
      alert("Success! DBF files updated.");
      setIsModalOpen(false);
    } catch (err) {
      console.error("Write Failed:", err);
      alert("Write failed: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3>PlantSCADA Tag Manager</h3>
          <select
            value={selectedProject?.path || ""}
            onChange={(e) => {
              const proj = projects.find(p => p.path === e.target.value);
              setSelectedProject(proj);
              if (proj) {
                axios.post('http://127.0.0.1:8000/api/settings', {
                  settings: { last_opened_project: proj.path }
                }).catch(console.error);
              }
            }}
            style={{ padding: '4px', background: '#333', color: '#fff', border: 'none' }}
          >
            {projects.map(p => (
              <option key={p.path} value={p.path}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setIsUDTBuilderOpen(true)} title="Manage UDTs">
            <Database size={18} style={{ marginRight: 4 }} /> UDTs
          </button>
          <button onClick={() => setIsSettingsOpen(true)} title="Settings">
            <Settings size={18} />
          </button>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div style={{ width: 1, background: '#555', margin: '0 4px' }}></div>
          <button onClick={handleSave} title="Save to Database">
            Save
          </button>
          <button onClick={handleImport} title="Import from DBF">
            <Download size={18} style={{ marginRight: 4 }} /> Re-Import
          </button>
          <button onClick={handlePreview} title="View Raw DBF">
            <Eye size={18} style={{ marginRight: 4 }} /> Preview
          </button>
          <button className="primary" onClick={handleGenerate}>Generate / Sync</button>
        </div>
      </header>
      <main style={{ padding: '16px', overflow: 'auto', height: 'calc(100vh - 60px)' }}>
        <TagGrid project={selectedProject} defaults={defaults} templates={templates} ref={gridRef} />
      </main>

      <DiffModal
        isOpen={isModalOpen}
        diff={diff}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmWrite}
      />

      <DBFPreviewModal
        isOpen={isPreviewOpen}
        diff={diff}
        onClose={() => setIsPreviewOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        project={selectedProject}
        onClose={() => {
          setIsSettingsOpen(false);
          if (selectedProject) fetchDefaults(selectedProject.path);
        }}
      />

      <UDTBuilderModal
        isOpen={isUDTBuilderOpen}
        onClose={() => setIsUDTBuilderOpen(false)}
      />

      <ImportDiffModal
        isOpen={isImportPreviewOpen}
        onClose={() => setIsImportPreviewOpen(false)}
        currentTags={gridRef.current?.getTags() || []}
        incomingTags={importIncomingTags}
        onConfirm={handleImportConfirm}
      />
    </>
  )
}

export default App
