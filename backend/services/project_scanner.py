
import os
import glob
from typing import List, Dict

class ProjectScanner:
    def __init__(self, root_path: str = r"C:\ProgramData\AVEVA Plant SCADA 2023 R2\User"):
        self.root_path = root_path

    def scan_projects(self) -> List[Dict[str, str]]:
        """
        Scans the root path for subdirectories containing 'variable.dbf'.
        Returns a list of dicts: {'name': 'ProjectName', 'path': 'Full/Path'}
        """
        projects = []
        if not os.path.exists(self.root_path):
            print(f"Warning: Root path {self.root_path} does not exist.")
            return []

        # List directories in root
        for entry in os.scandir(self.root_path):
            if entry.is_dir():
                # Check for variable.dbf (case insensitive check often required on windows, but glob helps)
                # We simply check if the file exists.
                # Common SCADA projects have variable.dbf in the project root.
                expected_dbf = os.path.join(entry.path, "variable.DBF")
                
                # Check for .dbf or .DBF
                if os.path.exists(expected_dbf) or os.path.exists(os.path.join(entry.path, "variable.dbf")):
                     projects.append({
                         "name": entry.name,
                         "path": entry.path
                     })
        
        return projects

    def get_dbf_path(self, project_path: str, dbf_name: str) -> str:
        """
        Constructs and validates the path to a specific DBF file in the project.
        """
        target = os.path.join(project_path, dbf_name)
        if os.path.exists(target):
            return target
        
        # Try lowercase extension if checked above failed
        target_lower = os.path.join(project_path, dbf_name.lower())
        if os.path.exists(target_lower):
            return target_lower
            
        return target # Return expected path even if missing (for creation?) 
