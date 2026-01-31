# TagGenSite - SCADA Tag Management & Generation Tool

**TagGenSite** is a specialized web application designed to streamline the management, generation, and synchronization of SCADA tag databases (specifically Citect/AVEVA DBF format). It allows engineers to import existing project DBF files, manage User Defined Types (UDTs) with parent-child relationships, generating tags in bulk, and ensuring data fidelity when writing back to disk.

## Key Features

### 🔧 Tag Management
- **Import/Export:** Seamlessly read and write `Variable.dbf`, `Trend.dbf`, and `DigAlm.dbf` files.
- **UDT Support:** Define "Virtual Parents" (UDT Instances) that automatically generate child member tags based on defined templates.
- **Full Fidelity:** Preserves all DBF fields (including extended Trend/Alarm parameters) to ensure no data is lost during round-trip operations.
- **Smart Filtering:** Advanced filtering, sorting, and grouping by Cluster, Equipment, or Tag Type.
- **Cascading Delete:** Deleting a UDT instance automatically removes all its generated member tags to keep your grid clean.

### ⚙️ Defaults & Auto-Fill
- **Variable Defaults:** Configure default *Cluster* and *IO Device* to auto-fill when creating new tags.
- **Trend/Alarm Defaults:** Set global defaults for sample periods, storage methods, alarm priorities, etc.
- **Smart Auto-Fill:** Ticking "Trend?" or "Alarm?" automatically populates fields from your defaults.
- **Filename Generation:** Trend filenames are automatically generated using a configurable prefix pattern (e.g. `[DATA]:Prefix\TagName\TagName`).
- **One-Click Clear:** Unchecking Trend/Alarm options instantly clears all related fields.

### ⚡ Generation & Reconciliation
- **Template Engine:** Uses a flexible template system to expand UDT instances into concrete tags.
- **Diff Logic:** Professional VS Code-style side-by-side comparison modal to review changes before writing to disk.
  - **Color-Coded Diffs:** Instantly spot additions (Green), deletions (Red), and modifications (Yellow) with field-level highlighting.
  - **GUID Preservation:** Smartly matches existing tags to preserve IDs and prevent duplicate entries.
  - **Manual Overrides:** Protects explicitly manually edited fields from being overwritten by template regeneration.

### 🎨 Modern UI
- **Data Grid:** High-performance, virtualized grid capable of handling thousands of tags.
- **Dark Mode:** Developer-centric dark theme with high density and low glare.
- **Visual Feedback:** Status indicators for generating, saving, and dirty states.
- **Inline Editing:** Excel-like inline editing for quick adjustments.

## Technology Stack

### Backend
- **Language:** Python 3.x
- **Framework:** FastAPI
- **Database:** SQLite (persisted as `project_data.db` for intermediate state)
- **Libraries:**
  - `dbf`: For reading/writing legacy DBF files.
  - `sqlalchemy`: ORM for internal data management.
  - `pydantic`: Data validation and serialization.

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Components:**
  - `@tanstack/react-table`: Powerful data grid features.
  - `lucide-react`: Modern icon set.
- **Styling:** Custom CSS with CSS Variables for theming.

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+

### 1. Backend Setup
```bash
cd backend
# Create virtual environment (optional but recommended)
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```
*Note: Ensure `requirements.txt` includes `fastapi`, `uvicorn`, `sqlalchemy`, `dbf`, `pydantic`.*

### 2. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Running the Application
1. Start the Backend API:
   ```bash
   cd backend
   python main.py
   # Runs on http://localhost:8000
   ```
2. Start the Frontend UI:
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:5173
   ```

## Usage Workflow

1. **Configure Defaults:** Open Settings (⚙️) to set your Project Defaults for IO Device, Trends, and Alarms.
2. **Select Project:** Enter the root path of your SCADA project containing the DBF files.
3. **Import Data:** Click **"Import DBF"** to load existing Variable, Trend, and Alarm data.
4. **Manage UDTs:**
   - Create "UDT Instances" (Virtual Parents).
   - Assign a "Type" (e.g., `MOTOR`, `VALVE`) to generate member tags.
5. **Edit & Override:**
   - Edit generated tags directly if specific deviations are needed.
   - Toggle the lock icon to enable "Manual Override" for specific rows.
   - Use "Add Tag" to create single tags with your configured defaults.
6. **Generate & Sync:**
   - Click **"Generate Tags"**.
   - Review the **Diff Modal** (VS Code style side-by-side view) to see exactly what will change.
   - Confirm to write back to the DBF files.

## Project Structure

```
TagGenSite/
├── backend/
│   ├── main.py                 # API Entry point & Controller logic
│   ├── models.py               # SQLAlchemy Database Models
│   ├── services/
│   │   ├── dbf_reader.py       # DBF Import Logic
│   │   ├── dbf_writer.py       # DBF Export & Reconciliation Logic
│   │   ├── udt_expander.py     # Tag Generation Engine
│   │   └── tag_sanitizer.py    # Naming convention enforcement
│   └── project_data.db         # Local SQLite storage
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TagGrid.jsx     # Main Data Grid Layout
│   │   │   ├── DiffModal.jsx   # Side-by-side Diff Viewer
│   │   │   └── ...
│   │   └── App.jsx             # Main Application Wrapper
│   └── package.json
└── README.md
```

## Contributing

- **State Management:** The backend is the source of truth. The frontend syncs heavily with the SQLite DB.
- **DBF Handling:** Special care is taken with `dbf` library encoding (cp1252/iso-8859-1) to support legacy SCADA systems.

## License
Proprietary / Internal Tool.
