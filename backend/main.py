
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import uvicorn
import os

from services.project_scanner import ProjectScanner
from services.tag_sanitizer import TagSanitizer
from services.dbf_writer import DBFWriter
from services.udt_expander import UDTExpander
from services.dbf_reader import DBFReader
from services.settings_service import SettingsService
from models import Base, TagEntry, GlobalReplacement, ProjectState, UdtTemplate, ProjectState
from database import engine, init_db, get_db
from sqlalchemy.orm import Session
from fastapi import Depends
import json
import datetime

# Init DB
init_db()

app = FastAPI(title="PlantSCADA Tag Management")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services
# Services
settings_service = SettingsService()
defaults = settings_service.get_defaults()
scanner = ProjectScanner(root_path=defaults.get("scada_root_path"))
sanitizer = TagSanitizer()
dbf_writer = DBFWriter()
udt_expander = UDTExpander()
dbf_reader = DBFReader()
udt_expander = UDTExpander()
dbf_reader = DBFReader()
# settings_service moved up

# Pydantic Models for API
class ProjectModel(BaseModel):
    name: str
    path: str

class SanitizeRequest(BaseModel):
    text: str

class SanitizeResponse(BaseModel):
    sanitized: str

class GenerateRequest(BaseModel):
    project_path: str
    tags: List[Dict[str, Any]] # Flexible dict for now

class GenerateResponse(BaseModel):
    diff: Dict[str, Any] # {'variable': {new:[], mod:[]...}, 'trend': ...}

class GlobalReplacementModel(BaseModel):
    character: str
    replacement: str

# Endpoints

@app.get("/api/projects", response_model=List[ProjectModel])
def list_projects():
    """Lists available SCADA projects."""
    return scanner.scan_projects()

@app.post("/api/sanitize", response_model=SanitizeResponse)
def sanitize_text(request: SanitizeRequest):
    """Sanitizes text based on current rules."""
    return {"sanitized": sanitizer.sanitize(request.text)}

@app.get("/api/replacements", response_model=List[GlobalReplacementModel])
def get_replacements():
    """Get current global replacement rules."""
    return [
        {"character": k, "replacement": v} 
        for k, v in sanitizer.replacements.items()
    ]

@app.post("/api/replacements")
def update_replacements(rules: List[GlobalReplacementModel]):
    """Update global replacement rules."""
    new_rules = {r.character: r.replacement for r in rules}
    sanitizer.update_replacements(new_rules)
    return {"status": "updated", "count": len(new_rules)}



from models import Base, TagEntry, GlobalReplacement, ProjectState, UdtTemplate

# ... (Previous imports)

class TemplateMember(BaseModel):
    suffix: str
    type: str # DIGITAL, INT, REAL..
    address_offset: str
    comment_template: str
    is_trend: bool = False
    is_alarm: bool = False
    alarm_category: Optional[str] = "1"
    alarm_help: Optional[str] = ""

class TemplateModel(BaseModel):
    name: str # PK
    description: str
    members: List[TemplateMember]

# Helper to get all templates (Default + DB)
def get_all_templates(db: Session):
    # Start with defaults
    templates = udt_expander.templates.copy()
    
    # Load from DB
    db_templates = db.query(UdtTemplate).all()
    for t in db_templates:
        try:
            members = json.loads(t.members_json)
            # Ensure format matches what expander expects
            templates[t.name] = {
                "description": t.description,
                "members": members
            }
        except:
            continue
    return templates

@app.get("/api/templates")
def list_templates(db: Session = Depends(get_db)):
    all_temps = get_all_templates(db)
    return list(all_temps.keys())

@app.get("/api/templates/detail")
def list_templates_detail(db: Session = Depends(get_db)):
    """Returns full template objects for the builder."""
    return get_all_templates(db)

@app.post("/api/templates")
def save_template(template: TemplateModel, db: Session = Depends(get_db)):
    # Check if exists
    existing = db.query(UdtTemplate).filter(UdtTemplate.name == template.name).first()
    members_json = json.dumps([m.dict() for m in template.members])
    
    if existing:
        existing.description = template.description
        existing.members_json = members_json
    else:
        new_t = UdtTemplate(name=template.name, description=template.description, members_json=members_json)
        db.add(new_t)
    
    db.commit()
    return {"status": "saved", "name": template.name}

@app.delete("/api/templates/{name}")
def delete_template(name: str, db: Session = Depends(get_db)):
    db.query(UdtTemplate).filter(UdtTemplate.name == name).delete()
    db.commit()
    return {"status": "deleted"}

@app.post("/api/generate", response_model=GenerateResponse)
def generate_tags(request: GenerateRequest, db: Session = Depends(get_db)):
    """
    1. Expand Tags (using DB templates)
    2. Reconcile with DBF
    3. Return Diff
    """
    templates = get_all_templates(db)
    
    # 1. Expand
    expanded = udt_expander.expand_tags(request.tags, override_templates=templates)
    
    # 2. Reconcile for each table type
    diffs = {}
    
    # Check variable.dbf
    var_dbf = scanner.get_dbf_path(request.project_path, "variable.dbf")
    diffs["variable"] = dbf_writer.reconcile_changes(expanded["variable"], var_dbf, key_field="NAME", enable_guid=True)
    
    # Check trend.dbf
    trend_dbf = scanner.get_dbf_path(request.project_path, "trend.dbf")
    diffs["trend"] = dbf_writer.reconcile_changes(expanded["trend"], trend_dbf, key_field="NAME", enable_guid=False)
    
    # Check digalm.dbf
    digalm_dbf = scanner.get_dbf_path(request.project_path, "digalm.dbf")
    diffs["digalm"] = dbf_writer.reconcile_changes(expanded["digalm"], digalm_dbf, key_field="TAG", enable_guid=False)
    
    return {"diff": diffs}

@app.post("/api/expand")
def expand_single_tag(tag: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Returns the expanded members for a single UDT instance.
    """
    templates = get_all_templates(db)
    
    # Wrap in list
    expanded = udt_expander.expand_tags([tag], override_templates=templates)
    
    combined = []
    for t_type in ["variable", "trend", "digalm"]:
        for item in expanded.get(t_type, []):
            item["_tag_type"] = t_type # Marker for UI
            combined.append(item)
            
    return combined
def write_changes(request: WriteRequest):
    """
    Commit changes to DBF files.
    """
    try:
        # Apply changes for each table
        diff = request.diff
        
        # Variable
        if "variable" in diff:
            path = scanner.get_dbf_path(request.project_path, "variable.dbf")
            dbf_writer.apply_diff(diff["variable"], path, "variable")
            
        # Trend
        if "trend" in diff:
            path = scanner.get_dbf_path(request.project_path, "trend.dbf")
            dbf_writer.apply_diff(diff["trend"], path, "trend")
            
        # DigAlm
        if "digalm" in diff:
            path = scanner.get_dbf_path(request.project_path, "digalm.dbf")
            dbf_writer.apply_diff(diff["digalm"], path, "digalm")
            
        return {"status": "success", "message": "Changes committed successfully."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings")
def get_settings(project_path: Optional[str] = None, db: Session = Depends(get_db)):
    # 1. Try to load from Project DB
    if project_path:
        state = db.query(ProjectState).filter(ProjectState.project_path == project_path).first()
        if state and state.settings_json:
            try:
                return json.loads(state.settings_json)
            except:
                pass

    # 2. Fallback to Global Settings (file-based)
    return settings_service.get_defaults()

class SettingsUpdate(BaseModel):
    project_path: Optional[str] = None
    settings: Dict[str, Any]

@app.post("/api/settings")
def update_settings(update: SettingsUpdate, db: Session = Depends(get_db)):
    # If project specific
    if update.project_path:
        state = db.query(ProjectState).filter(ProjectState.project_path == update.project_path).first()
        settings_str = json.dumps(update.settings)
        timestamp = datetime.datetime.now().isoformat()
        
        if state:
            state.settings_json = settings_str
        else:
            # Create new state if doesn't exist (though usually it should for a valid project)
            state = ProjectState(project_path=update.project_path, tags_json="[]", settings_json=settings_str, updated_at=timestamp)
            db.add(state)
        
        db.commit()
        return {"status": "saved", "scope": "project"}

    # Fallback to Global
    settings_service.save(update.settings)
    
    # Refresh Scanner if root path changed
    if "scada_root_path" in update.settings:
        scanner.root_path = update.settings["scada_root_path"]
        
    return {"status": "success"}

class ImportRequest(BaseModel):
    project_path: str

@app.post("/api/import")
def import_project(request: ImportRequest):
    """
    Reads existing DBFs and returns unified tag list.
    """
    tags = dbf_reader.read_project(request.project_path)
    return tags

@app.get("/")
def read_root():
    return {"message": "PlantSCADA Tag Manager API is running"}

class StateRequest(BaseModel):
    project_path: str
    tags: List[Dict[str, Any]]

@app.get("/api/state")
def get_project_state(path: str, db: Session = Depends(get_db)):
    state = db.query(ProjectState).filter(ProjectState.project_path == path).first()
    if not state:
        return {"found": False}
    return {"found": True, "tags": json.loads(state.tags_json), "updated_at": state.updated_at}

@app.post("/api/state")
def save_project_state(request: StateRequest, db: Session = Depends(get_db)):
    state = db.query(ProjectState).filter(ProjectState.project_path == request.project_path).first()
    timestamp = datetime.datetime.now().isoformat()
    tags_str = json.dumps(request.tags)
    
    if state:
        state.tags_json = tags_str
        state.updated_at = timestamp
    else:
        state = ProjectState(project_path=request.project_path, tags_json=tags_str, updated_at=timestamp)
        db.add(state)
    
    db.commit()
    return {"status": "saved", "timestamp": timestamp}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
