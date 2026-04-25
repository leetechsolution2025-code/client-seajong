import re

def find_duplicate_keys(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        # Look for things like style={{ key1: val1, key2: val2, key1: val3 }}
        style_matches = re.findall(r'style=\{\{\s*(.*?)\s*\}\}', line)
        for match in style_matches:
            keys = [k.strip().split(':')[0] for k in match.split(',')]
            duplicates = set([k for k in keys if keys.count(k) > 1])
            if duplicates:
                print(f"Line {i+1}: Duplicate keys found: {duplicates}")
                print(f"Content: {line.strip()}")

find_duplicate_keys('src/app/(dashboard)/marketing/events/page.tsx')
