
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class GlobalReplacement(Base):
    __tablename__ = "global_replacements"
    
    id = Column(Integer, primary_key=True, index=True)
    character = Column(String, unique=True, index=True)
    replacement = Column(String)

class TagEntry(Base):
    __tablename__ = "tag_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    entry_type = Column(String)  # 'single' or 'udt_instance'
    
    # Core Definition
    name_pattern = Column(String) # For single: TagName. For UDT: Prefix
    address_pattern = Column(String) # For single: Address. For UDT: Base Address
    description = Column(String, default="")
    
    # Metadata
    equipment = Column(String, default="")
    item = Column(String, default="")
    
    # UDT Specific
    udt_type = Column(String, nullable=True) # e.g. "Motor", "Valve"
    
    # UI State
    is_expanded = Column(Boolean, default=False)

class ProjectState(Base):
    __tablename__ = "project_states"
    
    project_path = Column(String, primary_key=True, index=True)
    tags_json = Column(String) # JSON blob of the entire grid state
    settings_json = Column(String, default="{}") # Project-specific defaults
    updated_at = Column(String) # ISO timestamp

class UdtTemplate(Base):
    __tablename__ = "udt_templates"
    
    name = Column(String, primary_key=True, index=True)
    description = Column(String, default="")
    members_json = Column(String) # JSON list of members
