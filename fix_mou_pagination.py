import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. We need to move `</div> {/* Close Page 1 */}` and `<div className="mou-print-page print-page-break">`
# to BE BEFORE `{/* Khái toán quầy kệ */}`.

# Let's find the block to move.
block_to_move = """              </div> {/* Close Page 1 */}

              {/* PAGE 2 */}
              <div className="mou-print-page print-page-break">"""

# Replace it with nothing where it currently is
content = content.replace(block_to_move, "")

# Insert it before Khái toán quầy kệ
insert_point = "                {/* Khái toán quầy kệ */}"
content = content.replace(insert_point, block_to_move + "\n" + insert_point)

with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated MOU pagination")
