
import dbf
import os

dbf_path = r"c:\Users\matly\Documents\AntiGrav\TagGenSite\ExampleFile\variable.DBF"

try:
    print(f"Attempting to read {dbf_path}")
    table = dbf.Table(dbf_path)
    table.open(dbf.READ_ONLY)
    
    print(f"Successfully opened. Record count: {len(table)}")
    print(f"Fields: {table.field_names}")
    
    if len(table) > 0:
        print("First record sample:")
        rec = table[0]
        for field in table.field_names[:5]: # Print first 5 fields
            print(f"  {field}: {rec[field]}")
            
    table.close()
    print("Test Complete.")
    
except Exception as e:
    print(f"Failed to read DBF: {e}")
