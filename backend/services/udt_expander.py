
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
            
            if entry.get("type") == "single":
                # Single Tag Logic
                base_name = entry.get("name", "")
                base_addr = entry.get("address", "")
                base_desc = entry.get("description", "")
                equip = entry.get("equipment", base_name)
                item = entry.get("item", "Value")
                
                # Check for trend/alarm flags
                is_trend = entry.get("isTrend", False)
                is_alarm = entry.get("isAlarm", False)
                
                var_rec = {
                    "NAME": base_name,
                    "TYPE": "DIGITAL", # TODO: Field for Data Type!
                    "UNIT": "IO_DEV_1",
                    "ADDR": base_addr,
                    "COMMENT": base_desc,
                    "EQUIP": equip,
                    "ITEM": item,
                    "CLUSTER": cluster
                }
                output["variable"].append(var_rec)
                
                if is_trend:
                    trend_rec = {
                         "NAME": base_name,
                         "EXPR": base_name,
                         "SAMPLEPER": entry.get("samplePeriod", "00:00:01"),
                         "TYPE": "TRN_PERIODIC",
                         "COMMENT": base_desc,
                         "EQUIP": equip,
                         "ITEM": item,
                         "CLUSTER": cluster
                    }
                    output["trend"].append(trend_rec)
                    
                if is_alarm:
                    alm_rec = {
                        "TAG": f"{base_name}_Alm",
                        "NAME": f"{base_name}_Alm",
                        "DESC": base_desc,
                        "VAR_A": base_name,
                        "CATEGORY": entry.get("alarmCategory", "1"),
                        "COMMENT": base_desc,
                        "EQUIP": equip,
                        "ITEM": item,
                        "CLUSTER": cluster
                    }
                    output["digalm"].append(alm_rec)

            elif entry.get("type") == "udt" and entry.get("udt_type") in self.templates:
                # UDT Logic
                template = self.templates[entry["udt_type"]]
                parent_name = entry.get("name", "")
                parent_addr = entry.get("address", "")
                parent_desc = entry.get("description", "")
                
                for member in template["members"]:
                    # 1. Variable Tag
                    tag_name = f"{parent_name}{member['suffix']}"
                    # Simple contact for address
                    tag_addr = f"{parent_addr}{member['address_offset']}"
                    tag_desc = member['comment_template'].format(parent_desc=parent_desc)
                    
                    var_rec = {
                        "NAME": tag_name,
                        "TYPE": member['type'],
                        "UNIT": "IO_DEV_1",
                        "ADDR": tag_addr,
                        "COMMENT": tag_desc,
                        "EQUIP": parent_name,    # User requirement: Instance -> Equip
                        "ITEM": member['suffix'].strip('.'), # User requirement: Suffix -> Item
                        "CLUSTER": cluster
                    }
                    output["variable"].append(var_rec)
                    
                    # 2. Trend Tag
                    if member.get("is_trend"):
                        trend_rec = {
                            "NAME": tag_name,
                            "EXPR": tag_name,
                            "SAMPLEPER": "00:00:01",
                            "TYPE": "TRN_PERIODIC",
                            "COMMENT": tag_desc,
                            "EQUIP": parent_name,
                            "ITEM": member['suffix'].strip('.'),
                            "CLUSTER": cluster
                        }
                        output["trend"].append(trend_rec)
                        
                    # 3. Alarm Tag
                    if member.get("is_alarm"):
                        alm_rec = {
                            "TAG": f"{tag_name}_Alm",
                            "NAME": f"{tag_name}_Alm",
                            "DESC": member.get("alarm_help", tag_desc),
                            "VAR_A": tag_name,
                            "CATEGORY": member.get("alarm_category", "1"),
                            "COMMENT": tag_desc,
                            "EQUIP": parent_name,
                            "ITEM": member['suffix'].strip('.'),
                            "CLUSTER": cluster
                        }
                        output["digalm"].append(alm_rec)
                        
        return output
