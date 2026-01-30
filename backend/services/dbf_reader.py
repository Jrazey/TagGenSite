
import dbf
import os
from typing import List, Dict, Any

class DBFReader:
    def read_project(self, project_path: str) -> List[Dict[str, Any]]:
        """
        Reads variable, trend, and digalm DBFs and merges them into unified records.
        """
        variable_records = {} # NAME -> Record
        
        # 1. Read Variable.dbf (Master List)
        var_path = os.path.join(project_path, "variable.dbf")
        if os.path.exists(var_path):
            try:
                table = dbf.Table(var_path)
                table.open(dbf.READ_ONLY)
                for record in table:
                    rec_dict = {field: str(record[field]).strip() for field in table.field_names}
                    name = rec_dict.get("NAME")
                    if name:
                        rec_dict["type"] = "single" # Mark as single/imported
                        rec_dict["id"] = name # Use name as ID for grid uniqueness
                        rec_dict["isTrend"] = False
                        rec_dict["isAlarm"] = False
                        variable_records[name] = rec_dict
                table.close()
            except Exception as e:
                print(f"Error reading variable.dbf: {e}")

        # 2. Read Trend.dbf (Merge)
        trend_path = os.path.join(project_path, "trend.dbf")
        if os.path.exists(trend_path):
            try:
                table = dbf.Table(trend_path)
                table.open(dbf.READ_ONLY)
                for record in table:
                    rec_dict = {field: str(record[field]).strip() for field in table.field_names}
                    # Linking logic: Usually Trend NAME or EXPR matches Variable NAME
                    # Let's try matching NAME first
                    name = rec_dict.get("NAME")
                    # Or try EXPR if NAME is just "Trend_01" but EXPR is "Pump_01"
                    # User request implies specific structure. Let's assume Name-to-Name or Expr-to-Name.
                    # Standard Citect: Trend tags often have same name as variable.
                    
                    if name in variable_records:
                        variable_records[name]["isTrend"] = True
                        # Merge trend fields. Avoid overwriting specific variable fields unless shared?
                        # Shared: CLUSTER, EQUIP, ITEM, COMMENT.
                        # We might want to keep the "Trend" version of these in separate keys if they differ?
                        # User wants "Unified Grid".
                        # Let's prefix trend specific fields? 
                        # Or just dump them in. Unique fields: SAMPLEPER, FILENAME, etc.
                        for k, v in rec_dict.items():
                            if k not in variable_records[name]:
                                variable_records[name][k] = v
                            elif variable_records[name][k] != v:
                                # Conflict on shared field.
                                # e.g. Variable Comment vs Trend Comment.
                                # For visual simplicity, maybe keep Variable as master?
                                # Store as trend_COMMENT?
                                pass
                table.close()
            except Exception as e:
                print(f"Error reading trend.dbf: {e}")

        # 3. Read DigAlm.dbf (Merge)
        alm_path = os.path.join(project_path, "digalm.dbf")
        if os.path.exists(alm_path):
            try:
                table = dbf.Table(alm_path)
                table.open(dbf.READ_ONLY)
                for record in table:
                    rec_dict = {field: str(record[field]).strip() for field in table.field_names}
                    # Link via VAR_A (Variable A)
                    var_a = rec_dict.get("VAR_A")
                    
                    if var_a in variable_records:
                        variable_records[var_a]["isAlarm"] = True
                        # Merge alarm fields
                        for k, v in rec_dict.items():
                            if k not in variable_records[var_a]:
                                variable_records[var_a][k] = v
                table.close()
            except Exception as e:
                 print(f"Error reading digalm.dbf: {e}")
                 
        return list(variable_records.values())
