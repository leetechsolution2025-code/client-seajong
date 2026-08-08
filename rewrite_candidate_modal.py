import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Outer portal wrapper
old_portal = """  return createPortal(
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 2000,
      display: "flex",
      flexDirection: "column",
      background: "#f8fafc",
      fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif"
    }}>"""

new_portal = """  return createPortal(
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: "all 0.3s" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", zIndex: 2001,
        transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s ease-in-out",
        background: "#f8fafc", display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif"
      }}>"""
content = content.replace(old_portal, new_portal)

# 2. Form wrapper
old_form = """        <form id="add-candidate-form" onSubmit={handleSubmit} className="mx-auto px-2 px-md-4" style={{ maxWidth: "1200px" }}>
          <div className="row g-3 g-md-4">
            <div className="col-lg-5">"""
new_form = """        <form id="add-candidate-form" onSubmit={handleSubmit} className="px-3" style={{ width: "100%" }}>
          <div className="d-flex flex-column gap-3">
            <div className="w-100">"""
content = content.replace(old_form, new_form)

# 3. Section 2 wrapper
old_sec2 = """            </div>

            <div className="col-lg-7">"""
new_sec2 = """            </div>

            <div className="w-100">"""
content = content.replace(old_sec2, new_sec2)

# 4. Closing tags
old_close = """    </div>,
    document.body
  );"""
new_close = """      </div>
    </>,
    document.body
  );"""
content = content.replace(old_close, new_close)

# 5. Make grid cols full width for 400px layout
# In the form, replace col-md-* with col-12
# We only want to replace within the AddCandidateModal
start_idx = content.find("function AddCandidateModal(")
end_idx = content.find("function ScheduleInterviewOffcanvas", start_idx)
modal_content = content[start_idx:end_idx]

modal_content = modal_content.replace('className="col-md-8"', 'className="col-12"')
modal_content = modal_content.replace('className="col-md-4"', 'className="col-12"')
modal_content = modal_content.replace('className="col-md-6"', 'className="col-12"')
modal_content = modal_content.replace('className="row g-3 g-md-4"', 'className="row g-3"')

# Fix sticky bottom actions (they were d-xl-none, let's make them always visible or remove the top buttons)
# Wait, the offcanvas top header has buttons. We can hide the bottom ones or keep them.
# Let's remove d-xl-none from bottom buttons so they show up at the bottom of the offcanvas
modal_content = modal_content.replace('className="d-flex d-xl-none', 'className="d-flex')
# Hide the top save button to avoid duplicate
modal_content = modal_content.replace('className="d-none d-xl-block"', 'className="d-none"')

content = content[:start_idx] + modal_content + content[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated AddCandidateModal layout")
