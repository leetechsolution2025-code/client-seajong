import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update formData initial state
target1 = '''  const [formData, setFormData] = useState({
    interviewDate: "",
    interviewLocation: "Văn phòng công ty",
    interviewNotes: "Vui lòng sử dụng trang phục phù hợp, có mặt đúng thời gian, địa điểm đã thông báo"
  });'''
replacement1 = '''  const [formData, setFormData] = useState({
    interviewDate: "",
    interviewLocation: "Văn phòng công ty",
    contactName: "",
    contactPhone: "",
    interviewNotes: "Vui lòng sử dụng trang phục phù hợp, có mặt đúng thời gian, địa điểm đã thông báo"
  });'''
if target1 in content:
    content = content.replace(target1, replacement1)

# 2. Update UI to include Contact Name and Contact Phone
target2 = '''              <div className="d-flex align-items-center gap-3">
                <label className="form-label small fw-bold text-dark mb-0" style={{ width: "100px", flexShrink: 0 }}>{isOnline ? 'Link phòng họp:' : 'Địa điểm:'}</label>
                <div className="input-group input-group-sm" style={{ flex: 1 }}>
                  <span className="input-group-text bg-light border-0 py-1"><i className={`bi ${isOnline ? 'bi-camera-video-fill' : 'bi-geo-alt'} text-primary`}></i></span>
                  <input
                    type="text"
                    className="form-control border-0 bg-light py-1"
                    style={{ fontSize: '0.85rem', height: '38px' }}
                    placeholder="Văn phòng hoặc link Meet..."
                    value={formData.interviewLocation}
                    onChange={e => setFormData(prev => ({ ...prev, interviewLocation: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>'''
replacement2 = '''              <div className="d-flex align-items-center gap-3 mb-2">
                <label className="form-label small fw-bold text-dark mb-0" style={{ width: "100px", flexShrink: 0 }}>{isOnline ? 'Link phòng họp:' : 'Địa điểm:'}</label>
                <div className="input-group input-group-sm" style={{ flex: 1 }}>
                  <span className="input-group-text bg-light border-0 py-1"><i className={`bi ${isOnline ? 'bi-camera-video-fill' : 'bi-geo-alt'} text-primary`}></i></span>
                  <input
                    type="text"
                    className="form-control border-0 bg-light py-1"
                    style={{ fontSize: '0.85rem', height: '38px' }}
                    placeholder="Văn phòng hoặc link Meet..."
                    value={formData.interviewLocation}
                    onChange={e => setFormData(prev => ({ ...prev, interviewLocation: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-3 mb-2">
                <label className="form-label small fw-bold text-dark mb-0" style={{ width: "100px", flexShrink: 0 }}>Người liên hệ:</label>
                <div className="input-group input-group-sm" style={{ flex: 1 }}>
                  <span className="input-group-text bg-light border-0 py-1"><i className="bi bi-person text-primary"></i></span>
                  <input
                    type="text"
                    className="form-control border-0 bg-light py-1"
                    style={{ fontSize: '0.85rem', height: '38px' }}
                    placeholder="Họ và tên người liên hệ..."
                    value={formData.contactName}
                    onChange={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-3">
                <label className="form-label small fw-bold text-dark mb-0" style={{ width: "100px", flexShrink: 0 }}>Số điện thoại:</label>
                <div className="input-group input-group-sm" style={{ flex: 1 }}>
                  <span className="input-group-text bg-light border-0 py-1"><i className="bi bi-telephone text-primary"></i></span>
                  <input
                    type="text"
                    className="form-control border-0 bg-light py-1"
                    style={{ fontSize: '0.85rem', height: '38px' }}
                    placeholder="Số điện thoại liên hệ..."
                    value={formData.contactPhone}
                    onChange={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>'''
if target2 in content:
    content = content.replace(target2, replacement2)
else:
    print("Target 2 not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated page.tsx offcanvas UI")
