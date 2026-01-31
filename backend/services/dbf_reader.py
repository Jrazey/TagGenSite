
import dbf
import os
from typing import List, Dict, Any

class DBFReader:
    def read_project(self, project_path: str) -> List[Dict[str, Any]]:
        """
        Reads variable, trend, and digalm DBFs and merges them into unified 'TagEntry' records
        using the Full-Fidelity Flat Schema.
        
        Sets `is_manual_override = True` for all imported tags to preserve them exactly.
        """
        variable_records = {} # NAME -> Record
        
        # --- 1. Read Variable.dbf (Master List) ---
        var_path = os.path.join(project_path, "variable.dbf")
        if os.path.exists(var_path):
            try:
                table = dbf.Table(var_path)
                table.open(dbf.READ_ONLY)
                for record in table:
                    # Strip whitespace from all fields
                    r = {field: str(record[field]).strip() for field in table.field_names}
                    
                    name = r.get("NAME")
                    if name:
                        # Initialize Flat Record
                        rec = {
                            "id": name, # Temporary ID for grid
                            "entry_type": "single",
                            "is_manual_override": True, # IMPORTED TAGS ARE LOCKED BY DEFAULT
                            "is_expanded": False,
                            
                            # Identity
                            "name": name,
                            "type": r.get("TYPE", "DIGITAL"),
                            "cluster": r.get("CLUSTER", ""),
                            "equipment": r.get("EQUIP", ""),
                            "item": r.get("ITEM", ""),
                            "description": r.get("COMMENT", ""),
                            
                            # Variable Specific mapped to var_*
                            "var_addr": r.get("ADDR", ""),
                            "var_unit": r.get("UNIT", ""),
                            "var_eng_units": r.get("ENG_UNITS", ""),
                            "var_format": r.get("FORMAT", ""),
                            "var_raw_zero": r.get("RAW_ZERO", ""),
                            "var_raw_full": r.get("RAW_FULL", ""),
                            "var_eng_zero": r.get("ENG_ZERO", ""),
                            "var_eng_full": r.get("ENG_FULL", ""),
                            
                            "editcode": r.get("EDITCODE", ""),
                            "linked": r.get("LINKED", ""),
                            "oid": r.get("OID", ""),
                            "ref1": r.get("REF1", ""),
                            "ref2": r.get("REF2", ""),
                            "deadband": r.get("DEADBAND", ""),
                            "custom": r.get("CUSTOM", ""),
                            "taggenlink": r.get("TAGGENLINK", ""),
                            "historian": r.get("HISTORIAN", ""),
                            
                            "custom1": r.get("CUSTOM1", ""), "custom2": r.get("CUSTOM2", ""),
                            "custom3": r.get("CUSTOM3", ""), "custom4": r.get("CUSTOM4", ""),
                            "custom5": r.get("CUSTOM5", ""), "custom6": r.get("CUSTOM6", ""),
                            "custom7": r.get("CUSTOM7", ""), "custom8": r.get("CUSTOM8", ""),
                            
                            "write_roles": r.get("WRITEROLES", ""),
                            "guid": r.get("GUID", ""),
                            
                            # Init Trend/Alarm flags
                            "is_trend": False,
                            "is_alarm": False
                        }
                        variable_records[name] = rec
                table.close()
            except Exception as e:
                print(f"Error reading variable.dbf: {e}")

        # --- 2. Read Trend.dbf (Merge) ---
        trend_path = os.path.join(project_path, "trend.dbf")
        if os.path.exists(trend_path):
            try:
                table = dbf.Table(trend_path)
                table.open(dbf.READ_ONLY)
                for record in table:
                    r = {field: str(record[field]).strip() for field in table.field_names}
                    
                    # Link by NAME (standard) or EXPR? Assuming NAME for now.
                    name = r.get("NAME")
                    
                    if name in variable_records:
                        rec = variable_records[name]
                        rec["is_trend"] = True # Set Flag
                        
                        # map trend_* fields - ALL fields to enable exact round-trip
                        rec.update({
                            "trend_name": r.get("NAME", ""),
                            "trend_expr": r.get("EXPR", ""),
                            "trend_trig": r.get("TRIG", ""),
                            "trend_sample_per": r.get("SAMPLEPER", ""),
                            "trend_priv": r.get("PRIV", ""),
                            "trend_area": r.get("AREA", ""),
                            "trend_eng_units": r.get("ENG_UNITS", ""),
                            "trend_format": r.get("FORMAT", ""),
                            "trend_filename": r.get("FILENAME", ""),
                            "trend_files": r.get("FILES", ""),
                            "trend_time": r.get("TIME", ""),
                            "trend_period": r.get("PERIOD", ""),
                            "trend_comment": r.get("COMMENT", ""),
                            "trend_type": r.get("TYPE", ""),
                            "trend_spcflag": r.get("SPCFLAG", ""),
                            "trend_lsl": r.get("LSL", ""),
                            "trend_usl": r.get("USL", ""),
                            "trend_subgrpsize": r.get("SUBGRPSIZE", ""),
                            "trend_xdoublebar": r.get("XDOUBLEBAR", ""),
                            "trend_range": r.get("RANGE", ""),
                            "trend_sdeviation": r.get("SDEVIATION", ""),
                            "trend_stormethod": r.get("STORMETHOD", ""),
                            "trend_cluster": r.get("CLUSTER", ""),
                            "trend_taggenlink": r.get("TAGGENLINK", ""),
                            "trend_editcode": r.get("EDITCODE", ""),
                            "trend_linked": r.get("LINKED", ""),
                            "trend_deadband": r.get("DEADBAND", ""),
                            "trend_equip": r.get("EQUIP", ""),
                            "trend_item": r.get("ITEM", ""),
                            "trend_historian": r.get("HISTORIAN", ""),
                            "trend_eng_zero": r.get("ENG_ZERO", ""),
                            "trend_eng_full": r.get("ENG_FULL", "")
                        })
                        
                table.close()
            except Exception as e:
                print(f"Error reading trend.dbf: {e}")

        # --- 3. Read DigAlm.dbf (Merge) ---
        alm_path = os.path.join(project_path, "digalm.dbf")
        if os.path.exists(alm_path):
            try:
                table = dbf.Table(alm_path)
                table.open(dbf.READ_ONLY)
                for record in table:
                    r = {field: str(record[field]).strip() for field in table.field_names}
                    
                    # Link via VAR_A (Variable A)
                    # This is the standard linking for Digital Alarms to Tags
                    var_a = r.get("VAR_A")
                    
                    if var_a in variable_records:
                        rec = variable_records[var_a]
                        rec["is_alarm"] = True
                        
                        # map alarm_* fields - ALL fields to enable exact round-trip
                        rec.update({
                            "alarm_tag": r.get("TAG", ""),
                            "alarm_name": r.get("NAME", ""),
                            "alarm_desc": r.get("DESC", ""),
                            "alarm_var_a": r.get("VAR_A", ""),
                            "alarm_var_b": r.get("VAR_B", ""),
                            "alarm_category": r.get("CATEGORY", ""),
                            "alarm_help": r.get("HELP", ""),
                            "alarm_priv": r.get("PRIV", ""),
                            "alarm_area": r.get("AREA", ""),
                            "alarm_comment": r.get("COMMENT", ""),
                            "alarm_sequence": r.get("SEQUENCE", ""),
                            "alarm_delay": r.get("DELAY", ""),
                            "alarm_custom1": r.get("CUSTOM1", ""),
                            "alarm_custom2": r.get("CUSTOM2", ""),
                            "alarm_custom3": r.get("CUSTOM3", ""),
                            "alarm_custom4": r.get("CUSTOM4", ""),
                            "alarm_custom5": r.get("CUSTOM5", ""),
                            "alarm_custom6": r.get("CUSTOM6", ""),
                            "alarm_custom7": r.get("CUSTOM7", ""),
                            "alarm_custom8": r.get("CUSTOM8", ""),
                            "alarm_cluster": r.get("CLUSTER", ""),
                            "alarm_taggenlink": r.get("TAGGENLINK", ""),
                            "alarm_paging": r.get("PAGING", ""),
                            "alarm_paginggrp": r.get("PAGINGGRP", ""),
                            "alarm_editcode": r.get("EDITCODE", ""),
                            "alarm_linked": r.get("LINKED", ""),
                            "alarm_equip": r.get("EQUIP", ""),
                            "alarm_item": r.get("ITEM", ""),
                            "alarm_historian": r.get("HISTORIAN", "")
                        })

                table.close()
            except Exception as e:
                 print(f"Error reading digalm.dbf: {e}")
                 
        return list(variable_records.values())
