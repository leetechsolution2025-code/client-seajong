import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We will wrap the scrollable div and the footer inside the form
# Find the start of the scrollable form section
start_target = '      {/* Scrollable Form */}\n      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="custom-scrollbar bg-white">\n        <form id="add-candidate-form" onSubmit={handleSubmit} style={{ width: "100%" }}>'
replacement_start = '      {/* Scrollable Form */}\n      <form id="add-candidate-form" onSubmit={handleSubmit} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>\n        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="custom-scrollbar bg-white">'

content = content.replace(start_target, replacement_start)

# Find the end of the form and footer
end_target = '          </div>\n        </form>\n      </div>\n\n      {/* Sticky Bottom Actions */}\n      <div className="bg-white p-3 border-top flex-shrink-0">\n        <BrandButton\n          type="submit"\n          form="add-candidate-form"\n          className="w-100"\n          loading={loading}\n          icon="bi-check-lg"\n        >\n          {editingCandidate ? "Cập nhật hồ sơ" : "Lưu hồ sơ"}\n        </BrandButton>\n      </div>'
replacement_end = '          </div>\n        </div>\n\n        {/* Sticky Bottom Actions */}\n        <div className="bg-white p-3 border-top flex-shrink-0">\n          <BrandButton\n            type="submit"\n            className="w-100"\n            loading={loading}\n            icon="bi-check-lg"\n          >\n            {editingCandidate ? "Cập nhật hồ sơ" : "Lưu hồ sơ"}\n          </BrandButton>\n        </div>\n      </form>'

content = content.replace(end_target, replacement_end)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Form wrapper updated")
