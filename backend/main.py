
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
from models import Base, TagEntry, GlobalReplacement

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
scanner = ProjectScanner()
sanitizer = TagSanitizer()
dbf_writer = DBFWriter()
udt_expander = UDTExpander()
dbf_reader = DBFReader()
settings_service = SettingsService()

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

@app.post("/api/generate", response_model=GenerateResponse)
def generate_tags(request: GenerateRequest):
    """
    1. Expand Tags
    2. Reconcile with DBF
    3. Return Diff
    """
    # 1. Expand
    expanded = udt_expander.expand_tags(request.tags)
    
    # 2. Reconcile for each table type
    diffs = {}
    
    # Check variable.dbf
    var_dbf = scanner.get_dbf_path(request.project_path, "variable.dbf")
    diffs["variable"] = dbf_writer.reconcile_changes(expanded["variable"], var_dbf, key_field="NAME")
    
    # Check trend.dbf
    trend_dbf = scanner.get_dbf_path(request.project_path, "trend.dbf")
    diffs["trend"] = dbf_writer.reconcile_changes(expanded["trend"], trend_dbf, key_field="NAME")
    
    # Check digalm.dbf
    digalm_dbf = scanner.get_dbf_path(request.project_path, "digalm.dbf")
    diffs["digalm"] = dbf_writer.reconcile_changes(expanded["digalm"], digalm_dbf, key_field="TAG")
    
    return {"diff": diffs}

@app.post("/api/expand")
def expand_single_tag(tag: Dict[str, Any]):
    """
    Returns the expanded members for a single UDT instance.
    Used for frontend 'preview' (expanding the row).
    """
    # Wrap in list
    expanded = udt_expander.expand_tags([tag])
    # Flatten structure for UI display?
    # The UI probably wants a list of "Child Rows" which are just objects.
    # We can return all created tags combined.
    
    combined = []
    for t_type in ["variable", "trend", "digalm"]:
        for item in expanded.get(t_type, []):
            item["_tag_type"] = t_type # Marker for UI
            combined.append(item)
            
    return combined

@app.get("/api/templates")
def list_templates():
    return udt_expander.get_templates()

class WriteRequest(BaseModel):
    project_path: str
    diff: Dict[str, Any] # The diff object returned by generate

@app.post("/api/write")
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
def get_settings():
    return settings_service.get_defaults()

@app.post("/api/settings")
def update_settings(defaults: Dict[str, Any]):
    settings_service.save(defaults)
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
