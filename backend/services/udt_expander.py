
from typing import List, Dict, Any
from services.tag_sanitizer import TagSanitizer

class UDTExpander:
    def __init__(self):
        self.sanitizer = TagSanitizer()
        # Basic templates
        self.templates = {
            "Motor_Basic": {
                "description": "Basic Motor Control",
                "members": [
                    {
                        "suffix": ".Run",
                        "type": "DIGITAL",
                        "address_offset": ".RunStatus",
                        "comment_template": "{parent_desc} Run Status",
                        "is_alarm": False,
                        "is_trend": True
                    },
                    {
                        "suffix": ".Fault",
                        "type": "DIGITAL",
                        "address_offset": ".Fault",
                        "comment_template": "{parent_desc} Fault",
                        "is_alarm": True,
                        "alarm_category": "ALM_CRIT",
                        "alarm_help": "Check motor breaker",
                        "is_trend": True
                    },
                     {
                        "suffix": ".Mode",
                        "type": "INT",
                        "address_offset": ".Mode",
                        "comment_template": "{parent_desc} Control Mode",
                        "is_trend": False
                    }
                ]
            },
             "Valve_Basic": {
                "description": "Basic Valve Control",
                "members": [
                    {
                        "suffix": ".Open",
                        "type": "DIGITAL",
                        "address_offset": ".Opened",
                        "comment_template": "{parent_desc} Open Limit",
                        "is_trend": True
                    },
                    {
                        "suffix": ".Closed",
                        "type": "DIGITAL",
                        "address_offset": ".Closed",
                        "comment_template": "{parent_desc} Closed Limit",
                        "is_trend": True
                    }
                ]
            }
        }
        
        # Schemas for forcing full field presence (Copied from DBFWriter to ensure consistency)
        self.schemas = {
             "variable": [
                "NAME", "TYPE", "UNIT", "ADDR", "RAW_ZERO", "RAW_FULL", "ENG_ZERO", "ENG_FULL",
                "ENG_UNITS", "FORMAT", "COMMENT", "EDITCODE", "LINKED", "OID", "REF1", "REF2",
                "DEADBAND", "CUSTOM", "TAGGENLINK", "CLUSTER", "EQUIP", "ITEM", "HISTORIAN",
                "CUSTOM1", "CUSTOM2", "CUSTOM3", "CUSTOM4", "CUSTOM5", "CUSTOM6", "CUSTOM7", "CUSTOM8",
                "WRITEROLES", "GUID"
            ],
            "trend": [
                "NAME", "EXPR", "TRIG", "SAMPLEPER", "PRIV", "AREA", "ENG_UNITS", "FORMAT",
                "FILENAME", "FILES", "TIME", "PERIOD", "COMMENT", "TYPE", "SPCFLAG", "LSL",
                "USL", "SUBGRPSIZE", "XDOUBLEBAR", "RANGE", "SDEVIATION", "STORMETHOD", "CLUSTER", "TAGGENLINK",
                "EDITCODE", "LINKED", "DEADBAND", "EQUIP", "ITEM", "HISTORIAN", "ENG_ZERO", "ENG_FULL"
            ],
             "digalm": [
                "TAG", "NAME", "DESC", "VAR_A", "VAR_B", "CATEGORY", "HELP", "PRIV", "AREA",
                "COMMENT", "SEQUENCE", "DELAY", "CUSTOM1", "CUSTOM2", "CUSTOM3", "CUSTOM4", "CUSTOM5",
                "CUSTOM6", "CUSTOM7", "CUSTOM8", "CLUSTER", "TAGGENLINK", "PAGING", "PAGINGGRP", "EDITCODE",
                "LINKED", "EQUIP", "ITEM", "HISTORIAN"
            ]
        }

    def _get_default_record(self, schema_type: str) -> Dict[str, str]:
        """Returns a dict with all schema fields initialized to empty string."""
        return {field: "" for field in self.schemas.get(schema_type, [])}

    def get_templates(self) -> List[str]:
        return list(self.templates.keys())

    def expand_tags(self, tag_entries: List[Dict], override_templates: Dict[str, Any] = None) -> Dict[str, List[Dict]]:
        """
        Takes a list of 'TagEntry' dictionaries (Flattened Full-Fidelity Schema).
        Returns a dictionary of 'variable', 'trend', 'digalm' lists ready for DBF comparison/writing.
        
        This logic now respects 'is_manual_override'.
        """
        templates = override_templates if override_templates else self.templates
        
        output = {
            "variable": [],
            "trend": [],
            "digalm": []
        }
        
        for entry in tag_entries:
            # --- COMMON IDENTITY ---
            is_override = entry.get("is_manual_override", False)
            entry_type = entry.get("entry_type", "single") # single, udt_instance, member
            
            # --- VIRTUAL PARENT RULE ---
            # UDT_INSTANCE entries are METADATA ONLY. They provide the "DNA" (prefix, base 
            # address, is_trend, is_alarm) for generating children, but are NOT written 
            # to DBF files themselves. Only 'single' and 'member' entries produce DBF records.
            # UDT_INSTANCE entries are handled separately below to generate their children.
            
            # --- SINGLE TAG or PRESERVED MEMBER ---
            # If it's a single tag OR a member that has been persisted, we use its values directly.
            # (Note: Frontend/DB flow sends flattened TagEntry objects)
            
            if entry_type == "single" or entry_type == "member":
                
                # 1. MAP FLAT -> VARIABLE DBF
                var_rec = self._get_default_record("variable")
                
                # Explicit Mapping from Flat Model (var_*) to DBF
                var_rec.update({
                    "NAME": entry.get("name", ""),
                    "TYPE": entry.get("type", "DIGITAL"),
                    "UNIT": entry.get("var_unit", ""),
                    "ADDR": entry.get("var_addr", ""),
                    "RAW_ZERO": entry.get("var_raw_zero", ""),
                    "RAW_FULL": entry.get("var_raw_full", ""),
                    "ENG_ZERO": entry.get("var_eng_zero", ""),
                    "ENG_FULL": entry.get("var_eng_full", ""),
                    "ENG_UNITS": entry.get("var_eng_units", ""),
                    "FORMAT": entry.get("var_format", ""),
                    "COMMENT": entry.get("description", ""), # Description maps to Variable Comment
                    "EDITCODE": entry.get("editcode", ""),
                    "LINKED": entry.get("linked", ""),
                    "OID": entry.get("oid", ""),
                    "REF1": entry.get("ref1", ""), "REF2": entry.get("ref2", ""),
                    "DEADBAND": entry.get("deadband", ""),
                    "CUSTOM": entry.get("custom", ""),
                    "TAGGENLINK": entry.get("taggenlink", ""),
                    "CLUSTER": entry.get("cluster", "Cluster1"),
                    "EQUIP": entry.get("equipment", ""),
                    "ITEM": entry.get("item", ""), # Item often blank for single tags
                    "HISTORIAN": entry.get("historian", ""),
                    
                    "CUSTOM1": entry.get("custom1", ""), "CUSTOM2": entry.get("custom2", ""),
                    "CUSTOM3": entry.get("custom3", ""), "CUSTOM4": entry.get("custom4", ""),
                    "CUSTOM5": entry.get("custom5", ""), "CUSTOM6": entry.get("custom6", ""),
                    "CUSTOM7": entry.get("custom7", ""), "CUSTOM8": entry.get("custom8", ""),
                    
                    "WRITEROLES": entry.get("write_roles", ""),
                    "GUID": entry.get("guid", "")
                })
                output["variable"].append(var_rec)
                
                # 2. MAP FLAT -> TREND DBF
                # Only if is_trend is true
                if entry.get("is_trend", False):
                    trend_rec = self._get_default_record("trend")
                    
                    # For imported records (manual override), use exact trend_* values
                    # For new records, fall back to shared var_* fields and defaults
                    is_imported = entry.get("is_manual_override", False)
                    
                    trend_rec.update({
                        "NAME": entry.get("trend_name") or entry.get("name", ""),
                        "EXPR": entry.get("trend_expr") or entry.get("name", ""),
                        "TRIG": entry.get("trend_trig", ""),
                        "SAMPLEPER": entry.get("trend_sample_per") if is_imported else entry.get("trend_sample_per", "00:00:01"),
                        "PRIV": entry.get("trend_priv", ""),
                        "AREA": entry.get("trend_area", ""),
                        # For imported: use trend-specific values; else fallback to var_* 
                        "ENG_UNITS": entry.get("trend_eng_units", "") if is_imported else entry.get("var_eng_units", ""),
                        "FORMAT": entry.get("trend_format", "") if is_imported else entry.get("var_format", ""),
                        "FILENAME": entry.get("trend_filename", ""),
                        "FILES": entry.get("trend_files") if is_imported else entry.get("trend_files", "2"),
                        "TIME": entry.get("trend_time", ""),
                        "PERIOD": entry.get("trend_period", ""),
                        "COMMENT": entry.get("trend_comment", "") if is_imported else entry.get("description", ""),
                        "TYPE": entry.get("trend_type") if is_imported else entry.get("trend_type", "TRN_PERIODIC"),
                        "SPCFLAG": entry.get("trend_spcflag", ""),
                        "LSL": entry.get("trend_lsl", ""),
                        "USL": entry.get("trend_usl", ""),
                        "SUBGRPSIZE": entry.get("trend_subgrpsize", ""),
                        "XDOUBLEBAR": entry.get("trend_xdoublebar", ""),
                        "RANGE": entry.get("trend_range", ""),
                        "SDEVIATION": entry.get("trend_sdeviation", ""),
                        "STORMETHOD": entry.get("trend_stormethod") if is_imported else entry.get("trend_stormethod", "Scaled"),
                        # For imported: use trend-specific shared fields
                        "CLUSTER": entry.get("trend_cluster", "") if is_imported else entry.get("cluster", ""),
                        "TAGGENLINK": entry.get("trend_taggenlink", "") if is_imported else entry.get("taggenlink", ""),
                        "EDITCODE": entry.get("trend_editcode", "") if is_imported else entry.get("editcode", ""),
                        "LINKED": entry.get("trend_linked", "") if is_imported else entry.get("linked", ""),
                        "DEADBAND": entry.get("trend_deadband", "") if is_imported else entry.get("deadband", ""),
                        "EQUIP": entry.get("trend_equip", "") if is_imported else entry.get("equipment", ""),
                        "ITEM": entry.get("trend_item", "") if is_imported else entry.get("item", ""),
                        "HISTORIAN": entry.get("trend_historian", "") if is_imported else entry.get("historian", ""),
                        "ENG_ZERO": entry.get("trend_eng_zero", "") if is_imported else entry.get("var_eng_zero", ""),
                        "ENG_FULL": entry.get("trend_eng_full", "") if is_imported else entry.get("var_eng_full", "")
                    })
                    output["trend"].append(trend_rec)
                    
                # 3. MAP FLAT -> ALARM DBF
                # Only if is_alarm is true
                if entry.get("is_alarm", False):
                    alm_rec = self._get_default_record("digalm")
                    
                    # For imported records, use exact alarm_* values
                    # For new records, fall back to shared fields and defaults
                    is_imported = entry.get("is_manual_override", False)
                    
                    alm_rec.update({
                        "TAG": entry.get("alarm_tag") or entry.get("name", ""),
                        "NAME": entry.get("alarm_name") or entry.get("name", ""),
                        "DESC": entry.get("alarm_desc") or entry.get("description", ""),
                        "VAR_A": entry.get("alarm_var_a") or entry.get("name", ""),
                        "VAR_B": entry.get("alarm_var_b", ""),
                        "CATEGORY": entry.get("alarm_category") if is_imported else entry.get("alarm_category", "1"),
                        "HELP": entry.get("alarm_help", ""),
                        "PRIV": entry.get("alarm_priv", ""),
                        "AREA": entry.get("alarm_area", ""),
                        "COMMENT": entry.get("alarm_comment", "") if is_imported else entry.get("description", ""),
                        "SEQUENCE": entry.get("alarm_sequence", ""),
                        "DELAY": entry.get("alarm_delay", ""),
                        # For imported: use alarm-specific custom fields
                        "CUSTOM1": entry.get("alarm_custom1", "") if is_imported else entry.get("custom1", ""),
                        "CUSTOM2": entry.get("alarm_custom2", "") if is_imported else entry.get("custom2", ""),
                        "CUSTOM3": entry.get("alarm_custom3", "") if is_imported else entry.get("custom3", ""),
                        "CUSTOM4": entry.get("alarm_custom4", "") if is_imported else entry.get("custom4", ""),
                        "CUSTOM5": entry.get("alarm_custom5", "") if is_imported else entry.get("custom5", ""),
                        "CUSTOM6": entry.get("alarm_custom6", "") if is_imported else entry.get("custom6", ""),
                        "CUSTOM7": entry.get("alarm_custom7", "") if is_imported else entry.get("custom7", ""),
                        "CUSTOM8": entry.get("alarm_custom8", "") if is_imported else entry.get("custom8", ""),
                        # For imported: use alarm-specific shared fields
                        "CLUSTER": entry.get("alarm_cluster", "") if is_imported else entry.get("cluster", ""),
                        "TAGGENLINK": entry.get("alarm_taggenlink", "") if is_imported else entry.get("taggenlink", ""),
                        "PAGING": entry.get("alarm_paging", ""),
                        "PAGINGGRP": entry.get("alarm_paginggrp", ""),
                        "EDITCODE": entry.get("alarm_editcode", "") if is_imported else entry.get("editcode", ""),
                        "LINKED": entry.get("alarm_linked", "") if is_imported else entry.get("linked", ""),
                        "EQUIP": entry.get("alarm_equip", "") if is_imported else entry.get("equipment", ""),
                        "ITEM": entry.get("alarm_item", "") if is_imported else entry.get("item", ""),
                        "HISTORIAN": entry.get("alarm_historian", "") if is_imported else entry.get("historian", "")
                    })
                    output["digalm"].append(alm_rec)

            # --- UDT INSTANCE LOGIC ---
            elif entry_type == "udt_instance" and entry.get("udt_type") in templates:
                # Retrieve Template
                template = templates[entry["udt_type"]]
                members = template.get("members", []) if isinstance(template, dict) else []
                
                # Identify Parent Props
                parent_base = entry.get("name", "") # Prefix
                parent_addr = entry.get("var_addr", "") # Base Address
                parent_desc = entry.get("description", "")
                cluster = entry.get("cluster", "Cluster1")
                
                # Iterate Members
                for member in members:
                    # NOTE: In a Full-Fidelity system, the "Members" should theoretically already exist 
                    # as 'entry_type="member"' rows in the database/input list if they were previously generated.
                    # 
                    # However, if this is a NEW UDT instance (not yet expanded/saved), we assume NO Override.
                    # We generate the virtual member here.
                    # 
                    # If we are strictly persistent, we should rely on the DB having the members.
                    # But for "Preview/Generate" we need to calculate them if they don't exist in the input.
                    
                    # Check if this member is already represented in the input 'tag_entries' list?
                    # The prompt implies: "When a UDT is added... populate full-fidelity columns".
                    # This implies the input `tag_entries` might ONLY contain the UDT Instance, and we must return the members?
                    # OR the input contains everything.
                    #
                    # For safety: We Generate the derived values here. Check for collision later?
                    # BUT: The caller (Generate) calls this. 
                    #
                    # If the user "Added" a UDT, we create the derived members now.
                    
                    # Logic: Always generate unless collision? No, the Requirement is internal to Key.
                    
                    # 1. Calculate Defaults
                    sanitized_suffix = self.sanitizer.sanitize(member['suffix'])
                    tag_name = f"{parent_base}{sanitized_suffix}"
                    tag_addr = f"{parent_addr}{member['address_offset']}"
                    tag_desc = member['comment_template'].format(parent_desc=parent_desc)
                    equip_val = parent_base
                    item_val = member['suffix'].lstrip('.')

                    # Populate Virtual Record (Full Fidelity)
                    # We create a 'virtual' full record here, mimicking what we did for 'single' above.
                    
                    var_rec = self._get_default_record("variable")
                    var_rec.update({
                        "NAME": tag_name,
                        "TYPE": member['type'],
                        "UNIT": entry.get("var_unit", ""), # Inherit or default? Likely default or specific member property
                        "ADDR": tag_addr,
                        "COMMENT": tag_desc,
                        "EQUIP": equip_val,
                        "ITEM": item_val,
                        "CLUSTER": cluster,
                        
                        "ENG_UNITS": member.get("engUnits", ""),
                        "FORMAT": member.get("format", ""),
                        "ENG_ZERO": member.get("engZero", ""),
                        "ENG_FULL": member.get("engFull", ""),
                        # ... other basic defaults empty
                    })
                    output["variable"].append(var_rec)
                    
                    # Trend (Virtual) - generate if template member has is_trend
                    if member.get("is_trend"):
                        trend_rec = self._get_default_record("trend")
                        trend_rec.update({
                            "NAME": tag_name,
                            "EXPR": tag_name,
                            "SAMPLEPER": member.get("sample_period", "00:00:01"),
                            "TYPE": member.get("trend_type", "TRN_PERIODIC"),
                            "COMMENT": tag_desc,
                            "EQUIP": equip_val,
                            "ITEM": item_val,
                            "CLUSTER": cluster,
                            "FILENAME": tag_name,
                            "FILES": member.get("trend_files", "2"),
                            "STORMETHOD": member.get("trend_storage", "Scaled"),
                            "TRIG": member.get("trend_trigger", ""),
                            "PRIV": member.get("trend_priv", ""),
                            "AREA": member.get("trend_area", ""),
                        })
                        output["trend"].append(trend_rec)

                    # Alarm (Virtual) - generate if template member has is_alarm
                    if member.get("is_alarm"):
                         alm_rec = self._get_default_record("digalm")
                         alm_rec.update({
                            "TAG": tag_name,
                            "NAME": tag_name,
                            "DESC": member.get("alarm_desc", tag_desc),
                            "VAR_A": tag_name,
                            "CATEGORY": member.get("alarm_category", "1"),

                            "AREA": member.get("alarm_area", ""),
                            "COMMENT": tag_desc,
                            "EQUIP": equip_val,
                            "ITEM": item_val,
                            "CLUSTER": cluster,
                            "HELP": member.get("alarm_help", ""),
                            "PRIV": member.get("alarm_priv", ""),
                            "DELAY": member.get("alarm_delay", "0")
                        })
                         output["digalm"].append(alm_rec)
                         
        return output
