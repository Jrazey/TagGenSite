
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import TagGrid from './components/TagGrid'
import DiffModal from './components/DiffModal'
import SettingsModal from './components/SettingsModal'
import { Settings, Download } from 'lucide-react'
import './index.css'

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [diff, setDiff] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [defaults, setDefaults] = useState(null);

  // Ref to access tag data from TagGrid
  const gridRef = useRef();

  useEffect(() => {
    // Fetch projects
    axios.get('http://127.0.0.1:8000/api/projects')
      .then(res => {
        setProjects(res.data);
        if (res.data.length > 0) setSelectedProject(res.data[0]);
      })
      .catch(err => console.error("Failed to fetch projects:", err));

    // Fetch Defaults
    fetchDefaults();
  }, []);

  const fetchDefaults = () => {
    axios.get('http://127.0.0.1:8000/api/settings')
      .then(res => setDefaults(res.data))
      .catch(console.error);
  }

  const handleGenerate = async () => {
    // 1. Get tags from grid
    if (!gridRef.current) return;
    const tags = gridRef.current.getTags();

    if (!selectedProject) {
      alert("Please select a project.");
      return;
    }

    try {
      // 2. Send to backend
      const res = await axios.post('http://127.0.0.1:8000/api/generate', {
        project_path: selectedProject.path,
        tags: tags
      });

      // 3. Show diff
      setDiff(res.data.diff);
      setIsModalOpen(true);

    } catch (err) {
      console.error("Analysis Failed:", err);
      alert("Analysis failed. Check console.");
    }
  };

  const handleImport = async () => {
    if (!selectedProject) return;
    if (!confirm("Importing will overwrite current grid. Continue?")) return;

    try {
      const res = await axios.post('http://127.0.0.1:8000/api/import', {
        project_path: selectedProject.path
      });

      if (gridRef.current) {
        gridRef.current.importTags(res.data);
      }
    } catch (e) {
      console.error("Import failed:", e);
      alert("Import failed. Check console.");
    }
  };

  const confirmWrite = async () => {
    if (!selectedProject || !diff) return;

    try {
      await axios.post('http://127.0.0.1:8000/api/write', {
        project_path: selectedProject.path,
        diff: diff
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
            }}
            style={{ padding: '4px', background: '#333', color: '#fff', border: 'none' }}
          >
            {projects.map(p => (
              <option key={p.path} value={p.path}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setIsSettingsOpen(true)} title="Settings">
            <Settings size={18} />
          </button>
          <button onClick={handleImport} title="Import from DBF">
            <Download size={18} style={{ marginRight: 4 }} /> Import
          </button>
          <button className="primary" onClick={handleGenerate}>Generate DBF</button>
        </div>
      </header>
      <main style={{ padding: '16px', overflow: 'auto', height: 'calc(100vh - 60px)' }}>
        <TagGrid project={selectedProject} defaults={defaults} ref={gridRef} />
      </main>

      <DiffModal
        isOpen={isModalOpen}
        diff={diff}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmWrite}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          fetchDefaults(); // Refresh on close
        }}
      />
    </>
  )
}

export default App
