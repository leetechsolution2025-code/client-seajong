import re

file_path = "src/components/my/InterviewsPage.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = '''        <WorkflowCard
          bottomToolbar={bottomToolbar}
          contentPadding="p-0"
        >
          {/* Desktop Table View */}'''

replacement = '''        <WorkflowCard
          bottomToolbar={bottomToolbar}
          contentPadding="p-0"
        >
          <div className="px-3 py-3 border-bottom bg-white d-flex align-items-center" style={{ borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem" }}>
            <h6 className="m-0 fw-bold text-dark letter-spacing-1">Danh sách các buổi phỏng vấn</h6>
          </div>
          
          {/* Desktop Table View */}'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added title successfully")
else:
    print("Target not found")
