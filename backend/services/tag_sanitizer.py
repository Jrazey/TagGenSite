
import re

class TagSanitizer:
    def __init__(self):
        # Default global replacements (can be updated from DB later)
        self.replacements = {
            ".": "_",
            " ": "_",
            "-": "_"
        }
        
    def sanitize(self, input_string: str) -> str:
        """
        Sanitizes a tag name using the cleaning logic:
        1. Apply global replacements (e.g. '.' -> '_')
        2. Replace non-alphanumeric characters with hex representation ^0xXX
        """
        if not input_string:
            return ""
            
        # 1. Apply global replacements first
        processed = input_string
        for char, replacement in self.replacements.items():
            processed = processed.replace(char, replacement)
            
        # 2. Apply Legacy Logic (ConvertNonAlphaNumToHex)
        # Allowed: 0-9, A-Z, a-z. Everything else -> ^0xXX
        # We also allow '_' in the final output as it's a standard SCADA char, 
        # BUT the legacy logic definitely encodes it if it's not in the allowed list.
        # Let's strictly follow the legacy logic provided:
        # Allowed: 0-9 (48-57), A-Z (65-90), a-z (97-122), and '/' (if listed in symbols)
        # The legacy VBA code had `symbols = "/"` permitted. 
        # However, standard SCADA usually allows underscores. 
        # For now, I will mimic the specific logic:
        
        output = []
        allowed_symbols = "/" # user legacy code had this.
        
        for char in processed:
            ascii_val = ord(char)
            is_digit = 48 <= ascii_val <= 57
            is_upper = 65 <= ascii_val <= 90
            is_lower = 97 <= ascii_val <= 122
            is_allowed_symbol = char in allowed_symbols
            
            # Common adjustment: Citect/PlantSCADA definitely allows underscores. 
            # If the user wants specific replacement of '.' to '_', then '_' must be valid.
            # I will add '_' to allowed list to prevent it becoming ^0x5F immediately after replacement.
            is_underscore = char == '_'

            if is_digit or is_upper or is_lower or is_allowed_symbol or is_underscore:
                output.append(char)
            else:
                # Convert to ^0xXX
                hex_val = format(ascii_val, 'X').upper().zfill(2)
                output.append(f"^0x{hex_val}")
                
        return "".join(output)

    def update_replacements(self, new_rules: dict):
        self.replacements = new_rules
