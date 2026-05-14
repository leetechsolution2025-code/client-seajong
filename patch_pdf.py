import re

with open("src/app/(dashboard)/marketing/plan/yearly/page.tsx", "r") as f:
    content = f.read()

# We need to find the `document={<>` block and extract it.
start_str = "document={\n            <>"
end_str = "            </>\n          }\n        />"

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx) + len(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find the document block")
    exit(1)

doc_block = content[start_idx:end_idx]

# Extract just the < > ... < /> inside document={ }
inner_content = content[start_idx + len("document={"): end_idx - len("        />")].strip()

# Create a variable at the beginning of the return statement
# Search for `return (\n    <>`
render_start = "  return (\n    <div className=\"marketing-plan-page\""
render_start_idx = content.find(render_start)

if render_start_idx == -1:
    print("Could not find render start")
    exit(1)

plan_doc_func = f"\n  const renderPlanDocument = () => (\n    {inner_content}\n  );\n\n"

new_content = content[:render_start_idx] + plan_doc_func + content[render_start_idx:start_idx] + "document={renderPlanDocument()}\n        />" + content[end_idx:]

# Additionally, add the hidden div right before {showPrintModal && (
hidden_div = """
      <div id="hidden-pdf-container" style={{ position: 'fixed', left: -9999, top: -9999, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div id="marketing-plan-hidden-content">
          {renderPlanDocument()}
        </div>
      </div>
"""

show_print_modal_str = "{showPrintModal && ("
spm_idx = new_content.find(show_print_modal_str)
new_content = new_content[:spm_idx] + hidden_div + new_content[spm_idx:]

with open("src/app/(dashboard)/marketing/plan/yearly/page.tsx", "w") as f:
    f.write(new_content)

print("Patch applied successfully")
