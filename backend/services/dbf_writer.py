
import struct
import uuid
import os
import shutil
from typing import List, Dict, Any
import dbf 

class DBFWriter:
    def __init__(self):
        # Schemas derived from example files (Field Name, Type, Length)
        self.schemas = {
             "variable": [
                ("NAME", "C", 79), ("TYPE", "C", 16), ("UNIT", "C", 31), ("ADDR", "C", 254),
                ("RAW_ZERO", "C", 11), ("RAW_FULL", "C", 11), ("ENG_ZERO", "C", 11), ("ENG_FULL", "C", 11),
                ("ENG_UNITS", "C", 8), ("FORMAT", "C", 11), ("COMMENT", "C", 254), ("EDITCODE", "C", 16),
                ("LINKED", "C", 1), ("OID", "C", 10), ("REF1", "C", 11), ("REF2", "C", 11),
                ("DEADBAND", "C", 11), ("CUSTOM", "C", 128), ("TAGGENLINK", "C", 32), ("CLUSTER", "C", 16),
                ("EQUIP", "C", 254), ("ITEM", "C", 63), ("HISTORIAN", "C", 6),
                ("CUSTOM1", "C", 254), ("CUSTOM2", "C", 254), ("CUSTOM3", "C", 254), ("CUSTOM4", "C", 254),
                ("CUSTOM5", "C", 254), ("CUSTOM6", "C", 254), ("CUSTOM7", "C", 254), ("CUSTOM8", "C", 254),
                ("WRITEROLES", "C", 254), ("GUID", "C", 36)
            ],
            "trend": [
                ("NAME", "C", 79), ("EXPR", "C", 254), ("TRIG", "C", 254), ("SAMPLEPER", "C", 16),
                ("PRIV", "C", 16), ("AREA", "C", 16), ("ENG_UNITS", "C", 8), ("FORMAT", "C", 11),
                ("FILENAME", "C", 253), ("FILES", "C", 4), ("TIME", "C", 32), ("PERIOD", "C", 32),
                ("COMMENT", "C", 254), ("TYPE", "C", 32), ("SPCFLAG", "C", 4), ("LSL", "C", 16),
                ("USL", "C", 16), ("SUBGRPSIZE", "C", 8), ("XDOUBLEBAR", "C", 16), ("RANGE", "C", 16),
                ("SDEVIATION", "C", 16), ("STORMETHOD", "C", 64), ("CLUSTER", "C", 16), ("TAGGENLINK", "C", 32),
                ("EDITCODE", "C", 16), ("LINKED", "C", 1), ("DEADBAND", "C", 16), ("EQUIP", "C", 254),
                ("ITEM", "C", 63), ("HISTORIAN", "C", 6), ("ENG_ZERO", "C", 11), ("ENG_FULL", "C", 11)
            ],
             "digalm": [
                ("TAG", "C", 79), ("NAME", "C", 79), ("DESC", "C", 254), ("VAR_A", "C", 254), ("VAR_B", "C", 254),
                ("CATEGORY", "C", 16), ("HELP", "C", 64), ("PRIV", "C", 16), ("AREA", "C", 16),
                ("COMMENT", "C", 254), ("SEQUENCE", "C", 16), ("DELAY", "C", 16), ("CUSTOM1", "C", 64),
                ("CUSTOM2", "C", 64), ("CUSTOM3", "C", 64), ("CUSTOM4", "C", 64), ("CUSTOM5", "C", 64),
                ("CUSTOM6", "C", 64), ("CUSTOM7", "C", 64), ("CUSTOM8", "C", 64), ("CLUSTER", "C", 16),
                ("TAGGENLINK", "C", 32), ("PAGING", "C", 8), ("PAGINGGRP", "C", 80), ("EDITCODE", "C", 16),
                ("LINKED", "C", 1), ("EQUIP", "C", 254), ("ITEM", "C", 63), ("HISTORIAN", "C", 6)
            ]
        }

    def generate_guid(self) -> str:
        return str(uuid.uuid4())

    def reconcile_changes(self, staging_data: List[Dict], existing_dbf_path: str, key_field: str = "NAME", enable_guid: bool = True) -> Dict[str, List]:
        """
        Compares staging data against an existing DBF.
        """
        
        diff = {
            "new": [],
            "modified": [],
            "orphaned": [],
            "unchanged": []
        }
        
        existing_records = {} # Map Key -> Record Dict
        
        if os.path.exists(existing_dbf_path):
            try:
                table = dbf.Table(existing_dbf_path)
                table.open(dbf.READ_ONLY)
                for record in table:
                    # Capture all fields to dict
                    rec_dict = {field: str(record[field]).strip() for field in table.field_names}
                    key = rec_dict.get(key_field)
                    if key:
                        existing_records[key] = rec_dict
                table.close()
            except Exception as e:
                print(f"Error reading DBF {existing_dbf_path}: {e}")

        # Compare Staging to Existing
        for record in staging_data:
            key = record.get(key_field)
            
            # --- GUID LOGIC ---
            if enable_guid:
                if key in existing_records:
                    existing_rec = existing_records[key]
                    existing_guid = existing_rec.get('GUID') or existing_rec.get('OID') 
                    
                    if existing_guid:
                        record['GUID'] = existing_guid
                    elif 'GUID' not in record:
                         record['GUID'] = self.generate_guid()
                elif 'GUID' not in record:
                    # New Record needs GUID if enabled
                    record['GUID'] = self.generate_guid()

                # --- MODIFICATION CHECK ---
                is_modified = False
                for k, v in record.items():
                    # Compare only fields present in staging (we enforce schema later)
                    if k in existing_rec:
                        val_stage = str(v).strip()
                        val_exist = existing_rec[k]
                        if val_stage != val_exist:
                            is_modified = True
                            break
                            
                if is_modified:
                    diff["modified"].append(record)
                else:
                    diff["unchanged"].append(record)
            else:
                # --- NEW RECORD ---
                if enable_guid and 'GUID' not in record:
                    record['GUID'] = self.generate_guid()
                diff["new"].append(record)
        
        # --- ORPHANS ---
        staging_keys = set(r.get(key_field) for r in staging_data)
        for key, rec in existing_records.items():
            if key not in staging_keys:
                diff["orphaned"].append(rec)
                
        return diff

    def apply_diff(self, diff: Dict[str, Any], target_path: str, table_type: str):
        """
        Applies the diff to the target DBF file.
        """
        # 1. Back up existing
        if os.path.exists(target_path):
            shutil.copy2(target_path, target_path + ".bak")
        
        # 2. Open (or Create) Table
        table = None
        if not os.path.exists(target_path):
            # Create new
            schema_def = "; ".join([f"{n} {t}({l})" for n,t,l in self.schemas[table_type]])
            table = dbf.Table(target_path, schema_def)
            table.open(dbf.READ_WRITE)
        else:
             table = dbf.Table(target_path)
             table.open(dbf.READ_WRITE)

        field_names = set(table.field_names)
        key_field = "TAG" if table_type == "digalm" else "NAME"
        
        # 3. Process Orphans (Delete)
        orphaned_names = set(r.get("NAME") or r.get("TAG") for r in diff["orphaned"])
        
        for record in table:
            if dbf.is_deleted(record): continue
            
            val = str(record[key_field]).strip()
            if val in orphaned_names:
                dbf.delete(record)
                
        # 4. Process Modified
        mod_map = {r[key_field]: r for r in diff["modified"]}
        if mod_map:
             for record in table:
                if dbf.is_deleted(record): continue
                
                rec_key = str(record[key_field]).strip()
                if rec_key in mod_map:
                    changes = mod_map[rec_key]
                    for k, v in changes.items():
                        if k in field_names:
                             # Safety check for field assignment
                            try:
                                record[k] = v
                            except Exception as e:
                                print(f"Warning: Failed to write {k}={v}: {e}")
        
        # 5. Process New (Append)
        for new_rec in diff["new"]:
            # Filter dict to only valid fields
            safe_rec = {k: v for k, v in new_rec.items() if k in field_names}
            try:
                table.append(safe_rec)
            except Exception as e:
                print(f"Warning: Failed to append record {new_rec.get(key_field)}: {e}")
            
        table.close()
