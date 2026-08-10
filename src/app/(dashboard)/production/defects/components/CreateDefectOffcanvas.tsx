import React, { useState, useEffect } from 'react';
import { BrandButton } from '@/components/ui/BrandButton';

interface CreateDefectOffcanvasProps {
  show: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function CreateDefectOffcanvas({ show, onClose, onRefresh }: CreateDefectOffcanvasProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    source: 'INTERNAL',
    status: 'NEW',
    productName: '',
    productCode: '',
    quantity: 1,
    description: '',
    customerId: '',
    customerName: '',
    orderNumber: '',
    reporterName: 'Lê Công Vụ',
    reporterDepartment: 'Ban Giám đốc',
    assignedTo: '',
    completionDate: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (show) {
      fetch('/api/plan-finance/customers?pageSize=200')
        .then(res => res.json())
        .then(data => {
          if (data.customers) setCustomers(data.customers);
        })
        .catch(console.error);

      fetch('/api/hr/employees?department=production&pageSize=100')
        .then(res => res.json())
        .then(data => {
          if (data.employees) {
            setEmployees(data.employees);
            const manager = data.employees.find((e: any) => e.level === 'Trưởng phòng' || e.level === 'Trưởng bộ phận');
            if (manager) {
              setFormData(prev => ({ ...prev, assignedTo: manager.fullName }));
            } else if (data.employees.length > 0) {
              setFormData(prev => ({ ...prev, assignedTo: data.employees[0].fullName }));
            }
          }
        })
        .catch(console.error);
    }
  }, [show]);

  useEffect(() => {
    if (formData.customerId) {
      fetch(`/api/sales/customer-orders?customerId=${formData.customerId}`)
        .then(res => res.json())
        .then(data => {
          if (data.orders) setOrders(data.orders);
        })
        .catch(console.error);
    } else {
      setOrders([]);
    }
  }, [formData.customerId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 5) {
        alert('Chỉ được phép đính kèm tối đa 5 tệp.');
        return;
      }
      setFiles([...files, ...newFiles]);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handleProductCodeBlur = async () => {
    if (!formData.productCode) return;
    try {
      const res = await fetch(`/api/plan-finance/inventory/search?q=${formData.productCode}&limit=5`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const item = data.items.find((i: any) => i.code.toLowerCase() === formData.productCode.toLowerCase()) || data.items[0];
        setFormData(prev => ({ ...prev, productName: item.tenHang }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) payload.append(key, String(value));
      });
      files.forEach(file => {
        payload.append('files', file);
      });

      const res = await fetch('/api/production/defects', {
        method: 'POST',
        body: payload,
      });
      if (res.ok) {
        onRefresh?.();
        onClose();
        setFormData({
          source: 'INTERNAL',
          status: 'NEW',
          productName: '',
          productCode: '',
          quantity: 1,
          description: '',
          customerId: '',
          customerName: '',
          orderNumber: '',
          reporterName: 'Lê Công Vụ',
          reporterDepartment: 'Ban Giám đốc',
          assignedTo: employees.find(e => e.level === 'Trưởng phòng' || e.level === 'Trưởng bộ phận')?.fullName || employees[0]?.fullName || '',
          completionDate: '',
        });
        setFiles([]);
      } else {
        alert('Có lỗi xảy ra khi tạo hồ sơ!');
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tạo hồ sơ!');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(formData.customerName.toLowerCase()));

  return (
    <>
      {show && (
        <div 
          className="offcanvas-backdrop fade show" 
          onClick={onClose}
          style={{ zIndex: 1040 }}
        ></div>
      )}

      <div 
        className={`offcanvas offcanvas-end shadow ${show ? 'show' : ''}`} 
        tabIndex={-1} 
        style={{ width: '400px', zIndex: 1045, visibility: show ? 'visible' : 'hidden' }}
      >
        <div className="offcanvas-header border-bottom bg-light">
          <h6 className="offcanvas-title fw-bold">Tạo hồ sơ lỗi mới</h6>
          <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
        </div>
        
        <div className="offcanvas-body d-flex flex-column p-0">
          <form onSubmit={handleSubmit} className="d-flex flex-column h-100 overflow-hidden">
            <div className="p-3 flex-grow-1 overflow-auto">
              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Người tạo</label>
                  <input type="text" className="form-control shadow-none bg-light" style={{ fontSize: 13 }} value="Lê Công Vụ" readOnly />
                </div>
                <div className="col-5">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Ngày tạo</label>
                  <input type="text" className="form-control shadow-none bg-light" style={{ fontSize: 13 }} value={new Date().toLocaleDateString('vi-VN')} readOnly />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Người xử lý</label>
                  <select 
                    className="form-select shadow-none" 
                    style={{ fontSize: 13 }}
                    value={formData.assignedTo}
                    onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  >
                    <option value="">Chọn người xử lý...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="col-5">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Ngày hoàn thành</label>
                  <input 
                    type="date" 
                    className="form-control shadow-none" 
                    style={{ fontSize: 13 }}
                    value={formData.completionDate}
                    onChange={e => setFormData({ ...formData, completionDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-4">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Trạng thái <span className="text-danger">*</span></label>
                  <select 
                    className="form-select shadow-none" 
                    style={{ fontSize: 13 }}
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="NEW">Chưa xử lý</option>
                    <option value="COMPLETED">Đã xử lý</option>
                  </select>
                </div>

                <div className="col-8 position-relative">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Tên khách hàng</label>
                  <input 
                    type="text" 
                    className="form-control shadow-none" 
                    style={{ fontSize: 13 }}
                    placeholder="Nhập để tìm khách hàng..."
                    value={formData.customerName}
                    onChange={e => {
                      setFormData({ ...formData, customerName: e.target.value, customerId: '' });
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  />
                  {showCustomerDropdown && (
                    <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 1000, maxHeight: 200, overflowY: 'auto' }}>
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                          <div 
                            key={c.id} 
                            className="px-3 py-2 border-bottom hover-bg-light"
                            style={{ fontSize: 13, cursor: 'pointer' }}
                            onMouseDown={() => {
                              setFormData({ ...formData, customerId: c.id, customerName: c.name, orderNumber: '' });
                              setShowCustomerDropdown(false);
                            }}
                          >
                            {c.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-muted" style={{ fontSize: 13 }}>Không tìm thấy...</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-8">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Số hiệu đơn hàng</label>
                  <select 
                    className="form-select shadow-none" 
                    style={{ fontSize: 13 }}
                    value={formData.orderNumber}
                    onChange={e => setFormData({ ...formData, orderNumber: e.target.value, productCode: '', productName: '' })}
                  >
                    <option value="">Chọn đơn hàng...</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.code || o.id}>{o.code || o.id}</option>
                    ))}
                  </select>
                </div>
                <div className="col-4">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Số lượng <span className="text-danger">*</span></label>
                  <input 
                    type="number" 
                    className="form-control shadow-none" 
                    style={{ fontSize: 13 }}
                    min={1}
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    required 
                  />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-5">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Nguồn lỗi <span className="text-danger">*</span></label>
                  <select 
                    className="form-select shadow-none" 
                    style={{ fontSize: 13 }}
                    value={formData.source}
                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                    required
                  >
                    <option value="INTERNAL">Nội bộ</option>
                    <option value="WARRANTY">Bảo hành</option>
                    <option value="RETURN">Trả về</option>
                  </select>
                </div>
                <div className="col-7">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Mã sản phẩm <span className="text-danger">*</span></label>
                  {orders.find(o => (o.code || o.id) === formData.orderNumber)?.saleOrderItems?.length > 0 ? (
                    <select 
                      className="form-select shadow-none"
                      style={{ fontSize: 13 }}
                      value={formData.productCode}
                      onChange={e => {
                        const val = e.target.value;
                        const selectedOrder = orders.find(o => (o.code || o.id) === formData.orderNumber);
                        const item = selectedOrder?.saleOrderItems?.find((i: any) => i.inventoryItem?.code === val);
                        setFormData({ 
                          ...formData, 
                          productCode: val, 
                          productName: item?.inventoryItem?.tenHang || '' 
                        });
                      }}
                      required
                    >
                      <option value="">Chọn sản phẩm...</option>
                      {orders.find(o => (o.code || o.id) === formData.orderNumber)?.saleOrderItems?.map((item: any) => (
                        <option key={item.id} value={item.inventoryItem?.code}>
                          {item.inventoryItem?.code}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      className="form-control shadow-none" 
                      style={{ fontSize: 13 }}
                      placeholder="VD: SJ-8012"
                      value={formData.productCode}
                      onChange={e => setFormData({ ...formData, productCode: e.target.value })}
                      onBlur={handleProductCodeBlur}
                      required 
                    />
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Tên sản phẩm <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  className="form-control shadow-none" 
                  style={{ fontSize: 13 }}
                  placeholder="Nhập tên sản phẩm..."
                  value={formData.productName}
                  onChange={e => setFormData({ ...formData, productName: e.target.value })}
                  required 
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Đính kèm tệp</label>
                <div 
                  className="border rounded p-3 text-center bg-light" 
                  style={{ borderStyle: 'dashed !important', cursor: 'pointer' }}
                  onClick={() => document.getElementById('defect-file-upload')?.click()}
                >
                  <i className="bi bi-cloud-arrow-up fs-4 text-primary mb-2"></i>
                  <div style={{ fontSize: 13 }} className="fw-medium">Nhấn để tải lên tệp ảnh/video</div>
                  <div className="form-text mt-1" style={{ fontSize: 11 }}>Tối đa 5 tệp. (JPG, PNG, MP4...)</div>
                </div>
                <input 
                  id="defect-file-upload"
                  type="file" 
                  className="d-none" 
                  multiple 
                  accept="image/*,video/*" 
                  onChange={handleFileChange}
                />
                
                {files.length > 0 && (
                  <div className="mt-2 d-flex flex-column gap-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="d-flex align-items-center justify-content-between border rounded p-2 bg-white shadow-sm">
                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                          <i className={`bi ${file.type.startsWith('video') ? 'bi-file-play-fill text-danger' : 'bi-image-fill text-primary'} fs-5`}></i>
                          <span className="text-truncate" style={{ fontSize: 12, maxWidth: '220px' }} title={file.name}>{file.name}</span>
                        </div>
                        <button type="button" className="btn btn-sm text-muted p-0 m-0 border-0 bg-transparent" onClick={() => removeFile(idx)}>
                          <i className="bi bi-x-circle-fill"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Mô tả hiện trạng <span className="text-danger">*</span></label>
                <textarea 
                  className="form-control shadow-none" 
                  rows={4}
                  style={{ fontSize: 13 }}
                  placeholder="Mô tả chi tiết tình trạng lỗi..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  required
                ></textarea>
              </div>
            </div>

            <div className="p-3 border-top bg-light mt-auto d-flex justify-content-end gap-2">
              <button 
                type="button"
                className="btn btn-outline-secondary px-4 fw-medium" 
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </button>
              <BrandButton 
                type="submit"
                variant="primary" 
                className="px-4 shadow-sm"
                loading={loading}
              >
                Lưu hồ sơ
              </BrandButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
