import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

default_text = "Vui lòng kiểm tra và đánh giá mức độ phù hợp của hồ sơ ứng viên"

# Update bulk action
target_bulk = '''  const handleSendToDeptReview = async () => {
    setConfirmConfig({
      open: true,
      title: "Chuyển duyệt chuyên môn",
      message: (
        <div>
          <p className="mb-2">Bạn có chắc chắn muốn chuyển {selectedCandidateIds.length} ứng viên đã chọn sang bộ phận chuyên môn để xét duyệt phỏng vấn?</p>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Lời nhắn cho người xem xét (không bắt buộc)..."
            style={{ fontSize: "13px" }}
            onChange={(e) => setTransferNote(e.target.value)}
          />
        </div>'''

replacement_bulk = f'''  const handleSendToDeptReview = async () => {{
    setTransferNote("{default_text}");
    setConfirmConfig({{
      open: true,
      title: "Chuyển duyệt chuyên môn",
      message: (
        <div>
          <p className="mb-2">Bạn có chắc chắn muốn chuyển {{selectedCandidateIds.length}} ứng viên đã chọn sang bộ phận chuyên môn để xét duyệt phỏng vấn?</p>
          <textarea
            className="form-control"
            rows={{3}}
            placeholder="Lời nhắn cho người xem xét (không bắt buộc)..."
            defaultValue="{default_text}"
            style={{{{ fontSize: "13px" }}}}
            onChange={{(e) => setTransferNote(e.target.value)}}
          />
        </div>'''

content = content.replace(target_bulk, replacement_bulk)


# Update single action
target_single = '''                  onClick={() => {
                    setConfirmConfig({
                      open: true,
                      title: "Chuyển duyệt chuyên môn",
                      message: (
                        <div>
                          <p className="mb-2">Chuyển hồ sơ của <strong>{selectedCandidate.name}</strong> cho bộ phận chuyên môn xét duyệt?</p>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Lời nhắn cho người xem xét (ví dụ: Ứng viên rất tiềm năng, sếp xem kỹ nhé)..."
                            style={{ fontSize: "13px" }}
                            onChange={(e) => setTransferNote(e.target.value)}
                          />
                        </div>'''

replacement_single = f'''                  onClick={() => {{
                    setTransferNote("{default_text}");
                    setConfirmConfig({{
                      open: true,
                      title: "Chuyển duyệt chuyên môn",
                      message: (
                        <div>
                          <p className="mb-2">Chuyển hồ sơ của <strong>{{selectedCandidate.name}}</strong> cho bộ phận chuyên môn xét duyệt?</p>
                          <textarea
                            className="form-control"
                            rows={{3}}
                            placeholder="Lời nhắn cho người xem xét (ví dụ: Ứng viên rất tiềm năng, sếp xem kỹ nhé)..."
                            defaultValue="{default_text}"
                            style={{{{ fontSize: "13px" }}}}
                            onChange={{(e) => setTransferNote(e.target.value)}}
                          />
                        </div>'''

content = content.replace(target_single, replacement_single)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated textareas with default messages")
