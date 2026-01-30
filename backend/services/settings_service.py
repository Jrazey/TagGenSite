
import os
import json
from typing import Dict, Any

SETTINGS_FILE = "defaults.json"

class SettingsService:
    def __init__(self):
        self.defaults = {
            "cluster": "Cluster1",
            "sample_period": "00:00:01",
            "trend_type": "TRN_PERIODIC",
            "trend_history": "365 weeks", # Not a real DBF field usually, but useful conceptual logic
            "alarm_category": "1",
            "alarm_priority": "1",
            "alarm_area": ""
        }
        self.load()

    def load(self):
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, 'r') as f:
                    data = json.load(f)
                    self.defaults.update(data)
            except Exception as e:
                print(f"Failed to load settings: {e}")

    def save(self, new_defaults: Dict[str, Any]):
        self.defaults.update(new_defaults)
        try:
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(self.defaults, f, indent=2)
        except Exception as e:
            print(f"Failed to save settings: {e}")
            
    def get_defaults(self) -> Dict[str, Any]:
        return self.defaults
