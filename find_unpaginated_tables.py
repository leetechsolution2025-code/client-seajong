import os
import glob

def check_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    if ('<Table' in content or '<table' in content) and 'limit=' in content:
        if 'Pagination' not in content and 'trang' not in content.lower() and 'page' not in content.lower():
            print(path)
        elif 'limit=100' in content or 'limit=1000' in content:
            # Maybe it has some page logic but hardcodes limit?
            print(f"Check manually: {path}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            check_file(os.path.join(root, file))
