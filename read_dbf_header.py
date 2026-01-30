
import struct
import os

def read_dbf_header(filepath):
    print(f"Reading header for: {filepath}")
    try:
        with open(filepath, 'rb') as f:
            # Read header prefix
            header_data = f.read(32)
            if len(header_data) < 32:
                print("  File too short.")
                return

            header_len = struct.unpack('<H', header_data[8:10])[0]
            
            # Read field descriptors
            f.seek(32)
            fields = []
            while f.tell() < header_len - 1: # Field array terminator is 0x0D
                field_data = f.read(32)
                if len(field_data) < 32:
                    break
                if field_data[0] == 0x0D:
                    break
                
                name = field_data[0:11].decode('latin-1').strip('\x00')
                type_char = chr(field_data[11])
                length = field_data[16]
                fields.append((name, type_char, length))
            
            for name, type_char, length in fields:
                print(f"  Field: {name} ({type_char}), Len: {length}")
                
    except Exception as e:
        print(f"  Error reading file: {e}")

base_dir = r"c:\Users\matly\Documents\AntiGrav\TagGenSite\ExampleFile"
files = ["variable.DBF", "trend.DBF", "digalm.DBF"]

for filename in files:
    read_dbf_header(os.path.join(base_dir, filename))
