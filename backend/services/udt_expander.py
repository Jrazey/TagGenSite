
from typing import List, Dict, Any

class UDTExpander:
    def __init__(self):
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

    def expand_tags(self, tag_entries: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Takes a list of user-defined 'TagEntries' (manual or UDT instances).
        Returns a dictionary of 'variable', 'trend', 'digalm' lists ready for DBF comparison.
        """
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
                    "UNIT": "IO_DEV_1",
                    "ADDR": base_addr,
                    "COMMENT": entry.get("description", ""),
                    "EQUIP": equip,
                    "ITEM": item,
                    "CLUSTER": cluster,
                    "ENG_UNITS": entry.get("engUnits", ""),
                    "FORMAT": "",
                    "ENG_ZERO": entry.get("engZero", ""),
                    "ENG_FULL": entry.get("engFull", "")
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
                        "TAG": entry.get("alarmName", f"{base_name}_Alm"),
                        "NAME": entry.get("alarmName", f"{base_name}_Alm"),
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
            elif entry.get("type") == "udt" and entry.get("udt_type") in self.templates:
                template = self.templates[entry["udt_type"]]
                parent_prefix = entry.get("name", "") # Prefix
                parent_addr = entry.get("address", "")
                parent_desc = entry.get("description", "")
                
                for member in template["members"]:
                    # 1. Variable Tag
                    tag_name = f"{parent_prefix}{member['suffix']}"
                    tag_addr = f"{parent_addr}{member['address_offset']}"
                    tag_desc = member['comment_template'].format(parent_desc=parent_desc)
                    
                    var_rec = {
                        "NAME": tag_name,
                        "TYPE": member['type'],
                        "UNIT": "IO_DEV_1",
                        "ADDR": tag_addr,
                        "COMMENT": tag_desc,
                        "EQUIP": parent_prefix,    
                        "ITEM": member['suffix'].strip('.'), 
                        "CLUSTER": cluster,
                        "_tag_type": member['type'], # For UI Helper
                        "trendName": tag_name,
                        "samplePeriod": entry.get("samplePeriod", "00:00:01"), # Default
                        "trendType": "TRN_PERIODIC",
                        "trendFiles": "2",
                        "trendStorage": "Scaled",
                        "alarmName": f"{tag_name}_Alm",
                        "alarmCategory": "1",
                        "alarmPriority": "1",
                        "alarmHelp": "",
                        "alarmDelay": "0"
                    }
                    output["variable"].append(var_rec)
                    
                    # 2. Trend Tag
                    if member.get("is_trend") and parent_trends_enabled:
                        trend_rec = {
                            "NAME": tag_name,
                            "EXPR": tag_name,
                            "SAMPLEPER": entry.get("samplePeriod", "00:00:01"),
                            "TYPE": "TRN_PERIODIC",
                            "COMMENT": tag_desc,
                            "EQUIP": parent_prefix,
                            "ITEM": member['suffix'].strip('.'),
                            "CLUSTER": cluster,
                            "FILENAME": tag_name,
                            "FILES": "2",
                            "STORMETHOD": "Scaled"
                        }
                        output["trend"].append(trend_rec)
                        
                    # 3. Alarm Tag
                    if member.get("is_alarm") and parent_alarms_enabled:
                        alm_rec = {
                            "TAG": f"{tag_name}_Alm",
                            "NAME": f"{tag_name}_Alm",
                            "DESC": member.get("alarm_help", tag_desc),
                            "VAR_A": tag_name,
                            "CATEGORY": entry.get("alarmCategory", member.get("alarm_category", "1")),
                            "COMMENT": tag_desc,
                            "EQUIP": parent_prefix,
                            "ITEM": member['suffix'].strip('.'),
                            "CLUSTER": cluster,
                            "HELP": member.get("alarm_help", ""),
                            "DELAY": "0"
                        }
                        output["digalm"].append(alm_rec)
                        
        return output
