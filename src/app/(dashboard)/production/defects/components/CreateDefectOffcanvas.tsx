import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { isProductionAdmin } from '@/lib/production-permissions';
import { BrandButton } from '@/components/ui/BrandButton';
import { Offcanvas } from '@/components/ui/Offcanvas';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

interface CreateDefectOffcanvasProps {
  show: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  defaultSource?: string;
}

function calculateItemRefundPricing(item: any, selectedOrder: any) {
  if (!item) {
    return {
      originalUnitPrice: 0,
      itemNetUnitPrice: 0,
      itemDiscountPct: 0,
      orderDiscountPct: 0,
      effectiveUnitPrice: 0,
      discountInfo: ''
    };
  }

  const originalUnitPrice = Number(item.donGia) || 0;
  const orderQty = Number(item.soLuong) || 1;
  const thanhTien = Number(item.thanhTien) !== undefined && !isNaN(Number(item.thanhTien))
    ? Number(item.thanhTien)
    : (originalUnitPrice * orderQty);

  // Đơn giá thực sau chiết khấu dòng sản phẩm
  const itemNetUnitPrice = orderQty > 0 ? (thanhTien / orderQty) : originalUnitPrice;
  
  // Tỷ lệ chiết khấu dòng sản phẩm (%)
  let itemDiscountPct = 0;
  if (originalUnitPrice > 0 && originalUnitPrice > itemNetUnitPrice) {
    itemDiscountPct = Math.round(((originalUnitPrice - itemNetUnitPrice) / originalUnitPrice) * 1000) / 10;
  }

  // Tỷ lệ chiết khấu tổng đơn hàng (%)
  const orderDiscountPct = Number(selectedOrder?.discount) || 0;

  // Đơn giá thực tế sau khi tính cả 2 tầng chiết khấu (dòng + tổng đơn)
  const effectiveUnitPrice = Math.max(0, Math.round(itemNetUnitPrice * (1 - orderDiscountPct / 100)));

  // Chuỗi tóm tắt thông tin chiết khấu
  const parts: string[] = [];
  if (itemDiscountPct > 0) parts.push(`CK sản phẩm -${itemDiscountPct}%`);
  if (orderDiscountPct > 0) parts.push(`CK đơn -${orderDiscountPct}%`);
  const discountInfo = parts.length > 0 
    ? `${parts.join(", ")} (Đơn giá thực: ${effectiveUnitPrice.toLocaleString('vi-VN')} đ/sp, gốc: ${originalUnitPrice.toLocaleString('vi-VN')} đ)`
    : '';

  return {
    originalUnitPrice,
    itemNetUnitPrice,
    itemDiscountPct,
    orderDiscountPct,
    effectiveUnitPrice,
    discountInfo
  };
}

export function CreateDefectOffcanvas({ show, onClose, onRefresh, defaultSource = 'INTERNAL' }: CreateDefectOffcanvasProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    source: defaultSource,
    status: 'NEW',
    productName: '',
    productCode: '',
    quantity: 1,
    refundAmount: 0,
    unitPrice: 0,
    effectiveUnitPrice: 0,
    itemDiscountPct: 0,
    orderDiscountPct: 0,
    discountInfo: '',
    description: '',
    customerId: '',
    customerName: '',
    customerAddress: '',
    orderNumber: '',
    reporterName: '',
    reporterDepartment: '',
    assignedTo: '',
    completionDate: '',
  });
  const [useDiscountedPrice, setUseDiscountedPrice] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  const { data: session } = useSession();
  const isProdAdmin = isProductionAdmin(session?.user);

  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({ 
        ...prev, 
        reporterName: session.user.name || '',
        reporterDepartment: (session.user as any).departmentName || 'Phòng ban khác'
      }));
    }
  }, [session]);

  useEffect(() => {
    if (show) {
      setFormData(prev => ({ ...prev, source: defaultSource }));
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
        const item = data.items.find((i: any) => (i.code ? i.code.toLowerCase() : "") === formData.productCode.toLowerCase()) || data.items[0];
        setFormData(prev => ({ ...prev, productName: item?.tenHang || "" }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProdAdmin) {
      alert("Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền tạo hồ sơ lỗi!");
      return;
    }
    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') payload.append(key, String(value));
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
          source: defaultSource,
          status: 'NEW',
          productName: '',
          productCode: '',
          quantity: 1,
          refundAmount: 0,
          unitPrice: 0,
          effectiveUnitPrice: 0,
          itemDiscountPct: 0,
          orderDiscountPct: 0,
          discountInfo: '',
          description: '',
          customerId: '',
          customerName: '',
          customerAddress: '',
          orderNumber: '',
          reporterName: session?.user?.name || '',
          reporterDepartment: (session?.user as any)?.departmentName || 'Phòng ban khác',
          assignedTo: employees.find(e => e.level === 'Trưởng phòng' || e.level === 'Trưởng bộ phận')?.fullName || employees[0]?.fullName || '',
          completionDate: '',
        });
        setUseDiscountedPrice(true);
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
    <Offcanvas 
      show={show} 
      onClose={onClose} 
      title="Tạo hồ sơ lỗi mới"
      width="400px"
      bodyClassName="offcanvas-body d-flex flex-column p-0"
    >
      <form onSubmit={handleSubmit} className="d-flex flex-column h-100 overflow-hidden">
            <div className="p-3 flex-grow-1 overflow-auto">
              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: 12 }}>Người tạo</label>
                  <input type="text" className="form-control shadow-none bg-light" style={{ fontSize: 13 }} value={formData.reporterName} readOnly />
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
                              setFormData({ ...formData, customerId: c.id, customerName: c.name, customerAddress: c.address || '', orderNumber: '' });
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
                    onChange={e => setFormData(prev => ({ 
                      ...prev, 
                      orderNumber: e.target.value, 
                      productCode: '', 
                      productName: '', 
                      unitPrice: 0, 
                      effectiveUnitPrice: 0,
                      itemDiscountPct: 0,
                      orderDiscountPct: 0,
                      discountInfo: '',
                      refundAmount: 0 
                    }))}
                  >
                    <option value="">Chọn đơn hàng...</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.code || o.id}>
                        {o.code || o.id} {o.discount > 0 ? `(CK đơn: -${o.discount}%)` : ''}
                      </option>
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
                    onChange={e => {
                      const qty = parseInt(e.target.value) || 1;
                      const priceToUse = useDiscountedPrice && formData.effectiveUnitPrice > 0 
                        ? formData.effectiveUnitPrice 
                        : (formData.unitPrice > 0 ? formData.unitPrice : 0);
                      setFormData(prev => ({ 
                        ...prev, 
                        quantity: qty,
                        refundAmount: priceToUse > 0 ? priceToUse * qty : prev.refundAmount
                      }));
                    }}
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
                        const item = selectedOrder?.saleOrderItems?.find((i: any) => 
                          (i.inventoryItem?.code && i.inventoryItem.code === val) || i.id === val || (i.code && i.code === val)
                        );
                        
                        if (item) {
                          const pricing = calculateItemRefundPricing(item, selectedOrder);
                          const priceToUse = useDiscountedPrice && pricing.effectiveUnitPrice > 0 
                            ? pricing.effectiveUnitPrice 
                            : pricing.originalUnitPrice;
                          const currentQty = formData.quantity || 1;
                          
                          setFormData(prev => ({ 
                            ...prev, 
                            productCode: item.inventoryItem?.code || item.code || val, 
                            productName: item.inventoryItem?.tenHang || item.tenHang || '',
                            unitPrice: pricing.originalUnitPrice,
                            effectiveUnitPrice: pricing.effectiveUnitPrice,
                            itemDiscountPct: pricing.itemDiscountPct,
                            orderDiscountPct: pricing.orderDiscountPct,
                            discountInfo: pricing.discountInfo,
                            refundAmount: priceToUse > 0 ? priceToUse * currentQty : 0
                          }));
                        } else {
                          setFormData(prev => ({ 
                            ...prev, 
                            productCode: val, 
                            productName: '',
                            unitPrice: 0,
                            effectiveUnitPrice: 0,
                            itemDiscountPct: 0,
                            orderDiscountPct: 0,
                            discountInfo: '',
                            refundAmount: 0
                          }));
                        }
                      }}
                      required
                    >
                      <option value="">Chọn sản phẩm trong đơn...</option>
                      {orders.find(o => (o.code || o.id) === formData.orderNumber)?.saleOrderItems?.map((item: any) => {
                        const selectedOrder = orders.find(o => (o.code || o.id) === formData.orderNumber);
                        const pricing = calculateItemRefundPricing(item, selectedOrder);
                        const hasDiscount = pricing.itemDiscountPct > 0 || pricing.orderDiscountPct > 0;
                        const codeVal = item.inventoryItem?.code || item.code || item.id;
                        return (
                          <option key={item.id} value={codeVal}>
                            {codeVal} - {item.inventoryItem?.tenHang || item.tenHang} 
                            {hasDiscount 
                              ? ` (Đã mua: ${item.soLuong} | Thực giá: ${pricing.effectiveUnitPrice.toLocaleString('vi-VN')} đ | Gốc: ${pricing.originalUnitPrice.toLocaleString('vi-VN')} đ)` 
                              : ` (Đã mua: ${item.soLuong} | ${pricing.originalUnitPrice.toLocaleString('vi-VN')} đ)`}
                          </option>
                        );
                      })}
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
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label fw-semibold text-muted mb-0" style={{ fontSize: 12 }}>
                    Giá trị hoàn trả / Giảm công nợ (VNĐ) {formData.source === 'RETURN' && <span className="text-danger">*</span>}
                  </label>
                  {formData.unitPrice > 0 && (
                    <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: 11 }}>
                      Đơn giá: {((useDiscountedPrice && formData.effectiveUnitPrice > 0 ? formData.effectiveUnitPrice : formData.unitPrice) || 0).toLocaleString('vi-VN')} đ
                    </span>
                  )}
                </div>

                {/* Bảng bóc tách chiết khấu theo đơn hàng */}
                {formData.unitPrice > 0 && (formData.itemDiscountPct > 0 || formData.orderDiscountPct > 0) && (
                  <div className="p-2.5 rounded-3 border bg-light-subtle mb-2" style={{ fontSize: 11.5 }}>
                    <div className="d-flex align-items-center justify-content-between mb-1.5 pb-1 border-bottom">
                      <span className="fw-semibold text-dark d-flex align-items-center gap-1">
                        <i className="bi bi-percent text-warning"></i>
                        Chiết khấu theo đơn hàng:
                      </span>
                      <div className="form-check form-switch mb-0 d-flex align-items-center gap-1">
                        <input
                          className="form-check-input shadow-none"
                          type="checkbox"
                          id="useDiscountedToggle"
                          style={{ cursor: "pointer" }}
                          checked={useDiscountedPrice}
                          onChange={e => {
                            const checked = e.target.checked;
                            setUseDiscountedPrice(checked);
                            const p = checked && formData.effectiveUnitPrice > 0 ? formData.effectiveUnitPrice : formData.unitPrice;
                            setFormData(prev => ({
                              ...prev,
                              refundAmount: p * (prev.quantity || 1)
                            }));
                          }}
                        />
                        <label className="form-check-label text-muted" htmlFor="useDiscountedToggle" style={{ fontSize: 11, cursor: "pointer" }}>
                          {useDiscountedPrice ? "Áp dụng giá sau CK" : "Áp dụng giá gốc"}
                        </label>
                      </div>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-3 text-muted">
                      <div>
                        Đơn giá gốc: <strong className="text-dark">{formData.unitPrice.toLocaleString('vi-VN')} đ</strong>
                      </div>
                      {formData.itemDiscountPct > 0 && (
                        <div>
                          CK sản phẩm: <strong className="text-danger font-monospace">-{formData.itemDiscountPct}%</strong>
                        </div>
                      )}
                      {formData.orderDiscountPct > 0 && (
                        <div>
                          CK tổng đơn: <strong className="text-danger font-monospace">-{formData.orderDiscountPct}%</strong>
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 pt-1 border-top d-flex justify-content-between align-items-center">
                      <span className="text-secondary">Đơn giá thực tế {useDiscountedPrice ? "(sau chiết khấu)" : "(giá gốc)"}:</span>
                      <strong className="text-primary font-monospace" style={{ fontSize: 12.5 }}>
                        {(useDiscountedPrice && formData.effectiveUnitPrice > 0 ? formData.effectiveUnitPrice : formData.unitPrice).toLocaleString('vi-VN')} đ / sp
                      </strong>
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <CurrencyInput 
                    className="form-control shadow-none fw-bold text-primary" 
                    style={{ fontSize: 13 }}
                    placeholder="0"
                    min={0}
                    value={formData.refundAmount || 0}
                    onChange={(val: number) => setFormData(prev => ({ ...prev, refundAmount: val }))}
                  />
                  <span className="input-group-text small bg-light text-muted">đ</span>
                </div>
                <div className="form-text text-muted" style={{ fontSize: 11 }}>
                  {formData.source === 'RETURN' 
                    ? "Số tiền này sẽ được tự động cấn trừ vào công nợ của khách hàng trên hệ thống."
                    : "Giá trị hàng hóa hoặc hoàn tiền liên quan (nếu có)."}
                </div>
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
                disabled={loading || !isProdAdmin}
                loading={loading}
                title={!isProdAdmin ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền tạo hồ sơ lỗi" : undefined}
              >
                Lưu hồ sơ
              </BrandButton>
            </div>
          </form>
    </Offcanvas>
  );
}
