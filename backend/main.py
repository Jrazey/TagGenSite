
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
    Returns: { variable: [...], trend: [...], digalm: [...] }
    """
    templates = get_all_templates(db)
    
    # Wrap in list
    expanded = udt_expander.expand_tags([tag], override_templates=templates)
    
    # Return the dict directly - frontend expects { variable: [], trend: [], digalm: [] }
    return expanded
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

class SaveTagsRequest(BaseModel):
    project_path: str
    tags: List[Dict[str, Any]]

@app.post("/api/save_tags")
def save_tags_db(request: SaveTagsRequest, db: Session = Depends(get_db)):
    """
    Full-Fidelity Save to SQLite.
    Replaces all tags for the given project.
    """
    # 1. Delete existing
    db.query(TagEntry).filter(TagEntry.project_path == request.project_path).delete()
    
    # 2. Iterate and Map
    new_entries = []
    timestamp = datetime.datetime.now().isoformat()
    
    for t in request.tags:
        # Helper: Get value with fallback
        def g(key, default=""):
            return t.get(key, default) or default # Handle None

        # Determine Entry Type
        etype = g("entry_type", "single") 
        if g("type") == "udt_instance": etype = "udt_instance" # Check legacy key if needed
        # Frontend updated to use 'entry_type' but let's be safe
        
        entry = TagEntry(
            project_path = request.project_path,
            entry_type = etype,
            is_manual_override = t.get("is_manual_override", False),
            is_expanded = t.get("is_expanded", False),
            
            # Identity
            name = g("citectName") or g("name"), # Prefix in Grid is 'name' for UDT, 'citectName' for single? 
            # In TagGrid: 
            # Single: name='FIT101_PV' (citectName), prefix is derived?
            # 'citectName' is the main edited "Tag Name".
            # 'name' is "Prefix" for UDTs.
            # We should probably store both or decide mapping.
            # TagEntry.name maps to VARIABLE.NAME. 
            # For UDT Instance, Name is the Instance Prefix.
            
            cluster = g("cluster"),
            type = g("udt_type") if etype == "udt_instance" else g("dataType"), # DBF TYPE vs UDT Type
            description = g("description"),
            equipment = g("equipment"),
            item = g("item"),
            
            # Variable
            var_addr = g("address") or g("var_addr"),
            var_unit = g("unit") or g("var_unit"),
            var_eng_units = g("engUnits") or g("var_eng_units"),
            var_eng_zero = g("engZero") or g("var_eng_zero"),
            var_eng_full = g("engFull") or g("var_eng_full"),
            var_format = g("format") or g("var_format"),
            
            # Variable Advanced
            var_raw_zero = g("rawZero"), var_raw_full = g("rawFull"),
            editcode = g("editCode"), linked = g("linked"), oid = g("oid"),
            ref1 = g("ref1"), ref2 = g("ref2"), deadband = g("deadband"),
            custom = g("custom"), taggenlink = g("tagGenLink"), historian = g("historian"),
            write_roles = g("writeRoles"), guid = g("guid"),
            
            # Custom
            custom1 = g("custom1"), custom2 = g("custom2"), custom3 = g("custom3"),
            custom4 = g("custom4"), custom5 = g("custom5"), custom6 = g("custom6"),
            custom7 = g("custom7"), custom8 = g("custom8"),

            # Trend
            is_trend = t.get("isTrend", False) or t.get("is_trend", False),
            trend_name = g("trendName") or g("trend_name"),
            trend_expr = g("trend_expr"), # Added in update
            trend_sample_per = g("samplePeriod") or g("trend_sample_per"),
            trend_type = g("trendType") or g("trend_type"),
            trend_filename = g("trendFilename") or g("trend_filename"),
            trend_storage = g("trendStorage") or g("trend_storage"),
            trend_files = g("trendFiles") or g("trend_files"),
            
            # Advanced Trend (from recent grid update)
            trend_trig = g("trend_trig"), trend_priv = g("trend_priv"), trend_area = g("trend_area"),
            # trend_time... etc if added
            
            # Alarm
            is_alarm = t.get("isAlarm", False) or t.get("is_alarm", False),
            alarm_tag = g("alarm_tag") or g("alarmTag"), # Grid accessor was alarm_tag logic?
            # Grid accessor: alarm_tag.
            
            alarm_name = g("alarmName") or g("alarm_name"), # Grid uses alarm_tag mostly for TAG 
            # DBF: 'TAG' is key. 'NAME' is redundant? TagGrid uses 'alarm_tag'. 
            # TagEntry.alarm_tag matches DBF TAG.
            
            alarm_desc = g("alarm_desc"),
            alarm_category = g("alarmCategory") or g("alarm_category"),
            alarm_help = g("alarm_help") or g("alarmHelp"),
            alarm_area = g("alarm_area") or g("alarmArea"),
            alarm_priv = g("alarm_priv"),
            alarm_delay = g("alarm_delay"),
            
            # Paging?
        )
        new_entries.append(entry)
        
    db.add_all(new_entries)
    
    # Update Project State (Timestamp)
    state = db.query(ProjectState).filter(ProjectState.project_path == request.project_path).first()
    if state:
        state.updated_at = timestamp
        # Optionally update tags_json too for legacy/quick load? 
        # Or remove tags_json reliance? 
        # Let's keep it in sync for now as backup.
        state.tags_json = json.dumps(request.tags)
    else:
        state = ProjectState(project_path=request.project_path, tags_json=json.dumps(request.tags), updated_at=timestamp)
        db.add(state)
        
    db.commit()
    return {"status": "saved", "count": len(new_entries)}

@app.get("/api/state")
def get_project_state(path: str, db: Session = Depends(get_db)):
    # Prefer loading from TagEntry table if data exists
    entries = db.query(TagEntry).filter(TagEntry.project_path == path).all()
    
    if entries:
        # Reconstruct Dicts from TagEntry
        tags = []
        for e in entries:
            # Map back to Frontend CamelCase / Hybrid
            t = {
                "id": str(e.id), # Use DB ID?
                "entry_type": e.entry_type,
                "is_manual_override": e.is_manual_override,
                "is_expanded": e.is_expanded,
                
                "name": e.name, # Prefix/Name
                "citectName": e.name, # Alias
                "cluster": e.cluster,
                "udt_type": e.type if e.entry_type == "udt_instance" else "",
                "type": e.type, # Raw Type
                
                "address": e.var_addr, "var_addr": e.var_addr,
                "unit": e.var_unit, "var_unit": e.var_unit,
                "engUnits": e.var_eng_units, "var_eng_units": e.var_eng_units,
                "engZero": e.var_eng_zero, "var_eng_zero": e.var_eng_zero,
                "engFull": e.var_eng_full, "var_eng_full": e.var_eng_full,
                "format": e.var_format, "var_format": e.var_format,
                "description": e.description,
                "equipment": e.equipment,
                "item": e.item,
                
                # Advanced Var
                "rawZero": e.var_raw_zero, "rawFull": e.var_raw_full,
                "editCode": e.editcode, "linked": e.linked, "oid": e.oid,
                "guid": e.guid, "writeRoles": e.write_roles,
                
                # Trend
                "isTrend": e.is_trend, "is_trend": e.is_trend,
                "trendName": e.trend_name, "trend_name": e.trend_name,
                "samplePeriod": e.trend_sample_per, "trend_sample_per": e.trend_sample_per,
                "trendType": e.trend_type, "trend_type": e.trend_type,
                "trendFilename": e.trend_filename, "trend_filename": e.trend_filename,
                "trend_expr": e.trend_expr,
                "trend_storage": e.trend_storage,
                
                # Alarm
                "isAlarm": e.is_alarm, "is_alarm": e.is_alarm,
                "alarmTag": e.alarm_tag, "alarm_tag": e.alarm_tag,
                "alarmName": e.alarm_name, "alarm_name": e.alarm_name,
                "alarmCategory": e.alarm_category, "alarm_category": e.alarm_category,
                "alarm_desc": e.alarm_desc,
                "alarm_help": e.alarm_help, "alarm_area": e.alarm_area,
                "alarm_delay": e.alarm_delay, "alarm_priv": e.alarm_priv
            }
            tags.append(t)
        
        # Check ProjectState for updated_at
        state = db.query(ProjectState).filter(ProjectState.project_path == path).first()
        updated_at = state.updated_at if state else ""
        return {"found": True, "tags": tags, "updated_at": updated_at}
        
    # Fallback to legacy JSON blob
    state = db.query(ProjectState).filter(ProjectState.project_path == path).first()
    if not state:
        return {"found": False}
    return {"found": True, "tags": json.loads(state.tags_json), "updated_at": state.updated_at}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
