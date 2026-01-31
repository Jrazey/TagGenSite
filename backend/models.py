
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
    
    # --- IDENTITY & HIERARCHY ---
    entry_type = Column(String, default="single")  # 'single', 'udt_instance', 'member'
    project_path = Column(String, index=True, default="") # Scope to specific project
    parent_id = Column(Integer, nullable=True)     # For members, points to udt_instance ID
    
    # --- CONTROL FLAGS ---
    is_manual_override = Column(Boolean, default=False) # Protection flag: If True, UDT logic skips overwriting
    is_expanded = Column(Boolean, default=False)        # UI state for grid expansion
    
    # --- SHARED / COMMON FIELDS ---
    name = Column(String, index=True)       # Maps to variable.NAME
    cluster = Column(String, default="")    # Maps to variable.CLUSTER (and trend/alarm)
    type = Column(String, default="DIGITAL")# Maps to variable.TYPE (or UDT Template Name for instances)
    description = Column(String, default="")# Maps to variable.COMMENT
    equipment = Column(String, default="")  # Maps to variable.EQUIP
    item = Column(String, default="")       # Maps to variable.ITEM
    
    # --- VARIABLE SPECIFIC (dbf: variable.dbf) ---
    var_addr = Column(String, default="")       # ADDR
    var_unit = Column(String, default="")       # UNIT
    var_eng_units = Column(String, default="")  # ENG_UNITS
    var_format = Column(String, default="")     # FORMAT
    var_raw_zero = Column(String, default="")   # RAW_ZERO
    var_raw_full = Column(String, default="")   # RAW_FULL
    var_eng_zero = Column(String, default="")   # ENG_ZERO
    var_eng_full = Column(String, default="")   # ENG_FULL
    
    editcode = Column(String, default="")       # EDITCODE (Shared?)
    linked = Column(String, default="")         # LINKED
    oid = Column(String, default="")            # OID
    ref1 = Column(String, default="")           # REF1
    ref2 = Column(String, default="")           # REF2
    deadband = Column(String, default="")       # DEADBAND
    custom = Column(String, default="")         # CUSTOM
    taggenlink = Column(String, default="")     # TAGGENLINK
    historian = Column(String, default="")      # HISTORIAN
    
    # Custom Fields 1-8
    custom1 = Column(String, default="")
    custom2 = Column(String, default="")
    custom3 = Column(String, default="")
    custom4 = Column(String, default="")
    custom5 = Column(String, default="")
    custom6 = Column(String, default="")
    custom7 = Column(String, default="")
    custom8 = Column(String, default="")
    
    write_roles = Column(String, default="")    # WRITEROLES
    guid = Column(String, default="")           # GUID
    
    # --- TREND SPECIFIC (dbf: trend.dbf) ---
    is_trend = Column(Boolean, default=False)   # Master switch for Trend generation
    
    trend_name = Column(String, default="")     # NAME (Trend) - usually same as var name
    trend_expr = Column(String, default="")     # EXPR
    trend_trig = Column(String, default="")     # TRIG
    trend_sample_per = Column(String, default="") # SAMPLEPER
    trend_priv = Column(String, default="")     # PRIV
    trend_area = Column(String, default="")     # AREA
    # trend_eng_units/format/comment etc usually inherit from Var but strict schema might need them separate
    
    trend_filename = Column(String, default="") # FILENAME
    trend_files = Column(String, default="")    # FILES
    trend_time = Column(String, default="")     # TIME
    trend_period = Column(String, default="")   # PERIOD
    trend_type = Column(String, default="")     # TYPE (TRN_PERIODIC etc)
    trend_spcflag = Column(String, default="")  # SPCFLAG
    trend_lsl = Column(String, default="")      # LSL
    trend_usl = Column(String, default="")      # USL
    trend_subgrpsize = Column(String, default="") # SUBGRPSIZE
    trend_xdoublebar = Column(String, default="") # XDOUBLEBAR
    trend_range = Column(String, default="")    # RANGE
    trend_sdeviation = Column(String, default="") # SDEVIATION
    trend_stormethod = Column(String, default="") # STORMETHOD
    
    # --- ALARM SPECIFIC (dbf: digalm.dbf / anaalm etc - assuming DigAlm for now) ---
    is_alarm = Column(Boolean, default=False)   # Master switch for Alarm generation
    
    alarm_tag = Column(String, default="")      # TAG (Alarm)
    alarm_name = Column(String, default="")     # NAME (Alarm) - usually distinct from Tag Name?
    alarm_desc = Column(String, default="")     # DESC
    alarm_var_a = Column(String, default="")    # VAR_A
    alarm_var_b = Column(String, default="")    # VAR_B
    alarm_category = Column(String, default="") # CATEGORY
    alarm_help = Column(String, default="")     # HELP
    alarm_priv = Column(String, default="")     # PRIV
    alarm_area = Column(String, default="")     # AREA
    # alarm_comment
    alarm_sequence = Column(String, default="") # SEQUENCE
    alarm_delay = Column(String, default="")    # DELAY
    alarm_paging = Column(String, default="")   # PAGING
    alarm_paginggrp = Column(String, default="")# PAGINGGRP

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
