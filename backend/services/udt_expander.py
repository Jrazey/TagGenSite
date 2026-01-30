
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

    def get_templates(self) -> List[str]:
        return list(self.templates.keys())

    def expand_tags(self, tag_entries: List[Dict], override_templates: Dict[str, Any] = None) -> Dict[str, List[Dict]]:
        """
        Takes a list of user-defined 'TagEntries' (manual or UDT instances).
        Returns a dictionary of 'variable', 'trend', 'digalm' lists ready for DBF comparison.
        """
        templates = override_templates if override_templates else self.templates
        
        output = {
            "variable": [],
            "trend": [],
            "digalm": []
        }
        
        for entry in tag_entries:
            # Common Fields
            cluster = entry.get("cluster", "Cluster1")
            
            # Parent Flags override Template Flags
            parent_trends_enabled = entry.get("isTrend", False)
            parent_alarms_enabled = entry.get("isAlarm", False)
            
            # --- SINGLE TAG LOGIC ---
            if entry.get("type") == "single":
                
                # Group A
                base_name = entry.get("citectName") or entry.get("name", "")
                base_addr = entry.get("address", "")
                
                # Group E
                equip = entry.get("equipment", base_name)
                item = entry.get("item", "Value")
                
                # Group B
                var_rec = {
                    "NAME": base_name,
                    "TYPE": entry.get("dataType", "DIGITAL"), 
                    "UNIT": entry.get("ioDevice", ""),
                    "ADDR": base_addr,
                    "COMMENT": entry.get("description", ""),
                    "EQUIP": equip,
                    "ITEM": item,
                    "CLUSTER": cluster,
                    "ENG_UNITS": entry.get("engUnits", ""),
                    "FORMAT": "",
                    "ENG_ZERO": entry.get("engZero", ""),
                    "ENG_FULL": entry.get("engFull", ""),
                    "WRITEROLES": "",
                    "CUSTOM1": "", "CUSTOM2": "", "CUSTOM3": "", "CUSTOM4": "",
                    "CUSTOM5": "", "CUSTOM6": "", "CUSTOM7": "", "CUSTOM8": ""
                }
                output["variable"].append(var_rec)
                
                # Group C
                if parent_trends_enabled:
                    trend_rec = {
                         "NAME": entry.get("trendName", base_name),
                         "EXPR": base_name,
                         "SAMPLEPER": entry.get("samplePeriod", "00:00:01"),
                         "TYPE": entry.get("trendType", "TRN_PERIODIC"),
                         "COMMENT": entry.get("description", ""),
                         "EQUIP": equip,
                         "ITEM": item,
                         "CLUSTER": cluster,
                         "FILENAME": entry.get("trendName", base_name), # Usually matches Trend Name
                         "FILES": entry.get("trendFiles", "2"),
                         "STORMETHOD": entry.get("trendStorage", "Scaled"),
                         "TRIG": entry.get("trendTrigger", "")
                    }
                    output["trend"].append(trend_rec)
                    
                # Group D
                if parent_alarms_enabled:
                    alm_rec = {
                        "TAG": entry.get("alarmName", base_name),
                        "NAME": entry.get("alarmName", base_name),
                        "DESC": entry.get("alarmHelp", ""), 
                        "VAR_A": base_name,
                        "CATEGORY": entry.get("alarmCategory", "1"),
                        "COMMENT": entry.get("description", ""),
                        "EQUIP": equip,
                        "ITEM": item,
                        "CLUSTER": cluster,
                        "HELP": entry.get("alarmHelp", ""),
                        "DELAY": entry.get("alarmDelay", "0")
                    }
                    output["digalm"].append(alm_rec)

            # --- UDT LOGIC ---
            elif entry.get("type") == "udt" and entry.get("udt_type") in templates:
                template = templates[entry["udt_type"]]
                # If template logic stored slightly differently in DB (e.g. wrapper), handle it.
                # Assuming structure { "members": [...] }
                # DB templates might be just the Members List if I store it that way?
                # Let's standardize: The DB stores the whole object or we reconstruct it.
                # In main.py I will ensure it matches { "members": ... } structure.
                
                members = template.get("members", []) if isinstance(template, dict) else []
                
                parent_base = entry.get("citectName") or entry.get("name", "")
                parent_addr = entry.get("address", "")
                parent_desc = entry.get("description", "")
                
                # Master Switches (Parent Row)
                parent_trends_enabled = entry.get("isTrend", False)
                parent_alarms_enabled = entry.get("isAlarm", False)

                for member in members:
                    # 1. Variable Tag
                    # Name = ParentTagName + Sanitized(Suffix)
                    # e.g Parent="New_Tag_Test", Suffix=".Run" -> "_Run" => "New_Tag_Test_Run"
                    
                    sanitized_suffix = self.sanitizer.sanitize(member['suffix'])
                    tag_name = f"{parent_base}{sanitized_suffix}"
                    # Address = Base + Offset (or just concatenation if offset starts with modifier)
                    # Adhering to prompt: [Parent_Address][Member_Suffix]
                    tag_addr = f"{parent_addr}{member['address_offset']}"
                    
                    # Description
                    tag_desc = member['comment_template'].format(parent_desc=parent_desc)
                    
                    # Metadata Mapping
                    # EQUIP = Parent Prefix
                    # ITEM = Member Suffix (stripped logic if needed, but Prompt says "Member Suffix")
                    # EQUIP = Parent Prefix (which is usually the Equipment Name in this schema)
                    # ITEM = Member Suffix (stripped logic if needed, but Prompt says "Member Suffix")
                    # Update: Using 'name' (Prefix) as Equipment is safer than full Tag Name
                    equip_val = entry.get("name", "")
                    item_val = member['suffix'].lstrip('.')

                    var_rec = {
                        "NAME": tag_name,
                        "TYPE": member['type'],
                        "UNIT": entry.get("ioDevice", ""), # Inherit I/O Device
                        "ADDR": tag_addr,
                        "COMMENT": tag_desc,
                        "EQUIP": equip_val,    
                        "ITEM": item_val, 
                        "CLUSTER": cluster,
                        
                        # New Fields
                        "ENG_UNITS": member.get("engUnits", ""),
                        "FORMAT": member.get("format", ""),
                        "ENG_ZERO": member.get("engZero", ""),
                        "ENG_FULL": member.get("engFull", ""),
                        "WRITEROLES": "",
                        "CUSTOM1": "", "CUSTOM2": "", "CUSTOM3": "", "CUSTOM4": "",
                        "CUSTOM5": "", "CUSTOM6": "", "CUSTOM7": "", "CUSTOM8": "",

                        "_tag_type": member['type'], 
                        
                        # Trend Attributes mapping
                        "trendName": tag_name,
                        "samplePeriod": member.get("sample_period", "00:00:01"),
                        "trendType": member.get("trend_type", "TRN_PERIODIC"),
                        "trendFiles": member.get("trend_files", "2"),
                        "trendStorage": member.get("trend_storage", "Scaled"),
                        "isTrend": member.get("is_trend", False) and parent_trends_enabled,

                        # Alarm Attributes mapping
                        "alarmName": tag_name,
                        "alarmCategory": member.get("alarm_category", "1"),
                        "alarmPriority": member.get("alarm_priority", "1"),
                        "alarmHelp": member.get("alarm_help", ""),
                        "alarmArea": member.get("alarm_area", ""),
                        "alarmDelay": "0",
                        "isAlarm": member.get("is_alarm", False) and parent_alarms_enabled
                    }
                    output["variable"].append(var_rec)
                    
                    # 2. Trend Tag
                    # Logic: Member.hasTrend AND Parent.isTrend
                    if member.get("is_trend") and parent_trends_enabled:
                        trend_rec = {
                            "NAME": tag_name,
                            "EXPR": tag_name, # Expression is usually the tag name
                            "SAMPLEPER": member.get("sample_period", "00:00:01"),
                            "TYPE": member.get("trend_type", "TRN_PERIODIC"),
                            "COMMENT": tag_desc,
                            "EQUIP": equip_val,
                            "ITEM": item_val,
                            "CLUSTER": cluster,
                            "FILENAME": tag_name,
                            "FILES": member.get("trend_files", "2"),
                            "STORMETHOD": member.get("trend_storage", "Scaled")
                        }
                        output["trend"].append(trend_rec)
                        
                    # 3. Alarm Tag
                    # Logic: Member.hasAlarm AND Parent.isAlarm
                    if member.get("is_alarm") and parent_alarms_enabled:
                         alm_rec = {
                            "TAG": tag_name,
                            "NAME": tag_name,
                            "DESC": member.get("alarm_help", tag_desc),
                            "VAR_A": tag_name,
                            "CATEGORY": member.get("alarm_category", "1"),
                            "PRIORITY": member.get("alarm_priority", "1"),
                            "AREA": member.get("alarm_area", ""),
                            "COMMENT": tag_desc,
                            "EQUIP": equip_val,
                            "ITEM": item_val,
                            "CLUSTER": cluster,
                            "HELP": member.get("alarm_help", ""),
                            "DELAY": "0"
                        }
                         output["digalm"].append(alm_rec)
                        
        return output
