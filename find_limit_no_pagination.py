import os
import glob

matches = []

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            # Look for fetch with limit
            if ('fetch(' in content or 'fetch`' in content or 'fetch"' in content or "fetch'" in content) and 'limit=' in content:
                # If they don't use the Pagination component
                if '<Pagination' not in content:
                    matches.append(path)

print("Files needing pagination check:")
for m in matches:
    print(m)
