"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";

export default function OpeningBalancesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/opening-balances?month=${month}&year=${year}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        alert(json.error || "Không thể tải dữ liệu");
      }
    } catch (err) {
      alert("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const handleValueChange = (id: string, field: "openingDebit" | "openingCredit", value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    const numValue = digitsOnly ? parseInt(digitsOnly, 10) : 0;
    
    setData(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: numValue };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const payload = {
        month,
        year,
        balances: data.map(d => ({
          id: d.id,
          openingDebit: d.openingDebit || 0,
          openingCredit: d.openingCredit || 0
        }))
      };

      const res = await fetch(`/api/finance/opening-balances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchData();
      } else {
        alert(json.error || "Không thể lưu dữ liệu");
      }
    } catch (err) {
      alert("Lỗi khi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const totalDebit = data.reduce((acc, curr) => acc + (curr.isParent ? 0 : (curr.openingDebit || 0)), 0);
  const totalCredit = data.reduce((acc, curr) => acc + (curr.isParent ? 0 : (curr.openingCredit || 0)), 0);
  const isBalanced = totalDebit === totalCredit;

  return (
    <StandardPage
      title="Khai báo số dư đầu kỳ"
      icon="bi-wallet2"
      useCard={false}
      paddingClassName="p-3 p-sm-4"
    >
      <div className="d-flex flex-column h-100 bg-white rounded-4 shadow-sm border overflow-hidden">
        {/* Header Actions */}
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom flex-shrink-0">
          <div className="text-muted small">
            Nhập số dư ban đầu cho các tài khoản để bắt đầu sử dụng phần mềm.
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ width: 150 }}>
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-calendar-month text-muted" />
              </span>
              <input
                type="month"
                className="form-control border-start-0 ps-0 bg-white"
                value={`${year}-${month.toString().padStart(2, '0')}`}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const [y, m] = val.split("-");
                    setYear(parseInt(y));
                    setMonth(parseInt(m));
                  }
                }}
              />
            </div>
            
            <button
              className="btn btn-primary btn-sm d-flex align-items-center gap-2"
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-save" />}
              Lưu số dư
            </button>
          </div>
        </div>

        {/* Scrollable Table Content */}
        <div className="flex-grow-1 overflow-auto">
          <table className="table table-hover mb-0" style={{ fontSize: 13.5 }}>
            <thead className="table-light sticky-top" style={{ zIndex: 10 }}>
              <tr>
                <th className="fw-semibold text-muted text-center border-top-0" style={{ width: 120 }}>SỐ TÀI KHOẢN</th>
                <th className="fw-semibold text-muted border-top-0">TÊN TÀI KHOẢN</th>
                <th className="fw-semibold text-muted text-end border-top-0" style={{ width: 250 }}>DƯ NỢ</th>
                <th className="fw-semibold text-muted text-end border-top-0" style={{ width: 250 }}>DƯ CÓ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-5">
                    <div className="spinner-border text-primary" />
                    <div className="mt-2 text-muted">Đang tải dữ liệu...</div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted">
                    Chưa có tài khoản kế toán nào. Vui lòng thêm trong Danh mục tài khoản.
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const isParent = item.isParent;
                  const paddingLeft = item.level > 0 ? (item.level * 20) + 12 : 12;

                  return (
                    <tr key={item.id} className={isParent ? "table-active fw-bold" : ""}>
                      <td className="align-middle text-center">{item.code}</td>
                      <td className="align-middle" style={{ paddingLeft }}>
                        {item.level > 0 && <i className="bi bi-arrow-return-right text-muted me-2" style={{ fontSize: 10 }} />}
                        {item.name}
                      </td>
                      <td className="p-1" style={{ width: 250 }}>
                        <input
                          type="text"
                          className={`form-control form-control-sm text-end ${isParent ? "bg-transparent border-0" : ""}`}
                          value={item.openingDebit ? item.openingDebit.toLocaleString("vi-VN") : ""}
                          onChange={(e) => handleValueChange(item.id, "openingDebit", e.target.value)}
                          disabled={isParent}
                          placeholder={isParent ? "" : "0"}
                          style={{ fontWeight: isParent ? "bold" : "normal" }}
                        />
                      </td>
                      <td className="p-1" style={{ width: 250 }}>
                        <input
                          type="text"
                          className={`form-control form-control-sm text-end ${isParent ? "bg-transparent border-0" : ""}`}
                          value={item.openingCredit ? item.openingCredit.toLocaleString("vi-VN") : ""}
                          onChange={(e) => handleValueChange(item.id, "openingCredit", e.target.value)}
                          disabled={isParent}
                          placeholder={isParent ? "" : "0"}
                          style={{ fontWeight: isParent ? "bold" : "normal" }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Fixed Footer */}
        <div className="bg-light border-top flex-shrink-0">
          <table className="table mb-0" style={{ fontSize: 13.5 }}>
            <tfoot>
              <tr className="fw-bold">
                <td className="text-end py-3 px-3 align-middle">TỔNG CỘNG:</td>
                <td className={`text-end py-3 px-3 align-middle ${!isBalanced ? "text-danger" : "text-success"}`} style={{ width: 250 }}>
                  {totalDebit.toLocaleString("vi-VN")}
                </td>
                <td className={`text-end py-3 px-3 align-middle ${!isBalanced ? "text-danger" : "text-success"}`} style={{ width: 250 }}>
                  {totalCredit.toLocaleString("vi-VN")}
                </td>
              </tr>
              {!isBalanced && (
                <tr>
                  <td colSpan={3} className="text-center text-danger small py-2 bg-danger bg-opacity-10 border-top-0">
                    <i className="bi bi-exclamation-triangle me-1" />
                    Tổng Dư Nợ và Tổng Dư Có đang không cân bằng (Chênh lệch: {Math.abs(totalDebit - totalCredit).toLocaleString("vi-VN")}). Vui lòng kiểm tra lại trước khi lưu!
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    </StandardPage>
  );
}
