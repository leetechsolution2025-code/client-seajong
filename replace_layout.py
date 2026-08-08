import re

with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# We need to extract the Filters & Actions block
start_filters = content.find('{/* Filters & Actions */}')
end_filters = content.find('{/* List */}')

filters_block = content[start_filters:end_filters].strip()

# Now the Table block
start_table = content.find('{loading ? (')
end_table = content.find('{/* Offcanvas')
table_block = content[start_table:end_table].strip()
# table_block ends with </div> which is the closing of the List div.
# Let's clean it up
if table_block.endswith('</div>'):
    table_block = table_block[:-6].strip()

# Create the new return statement
new_return = f"""  return (
    <div className="h-100 position-relative bg-white overflow-hidden">
      <style>{{`
        .app-responsive-table-wrapper {{
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: auto !important;
        }}
      `}}</style>
      
      <FullWidthTableLayout
        header={{
          {filters_block}
        }}
        table={{
          {table_block}
        }}
      />
"""

# Replace everything from the return( to the offcanvas start
start_return = content.find('  return (\n    <div className="d-flex flex-column gap-2 h-100 overflow-hidden bg-white p-3 position-relative">')
end_return = content.find('{/* Offcanvas cho Chi tiết')

if start_return != -1 and end_return != -1:
    content = content[:start_return] + new_return + "\n      " + content[end_return:]
    with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Success")
else:
    print("Failed to find boundaries")

