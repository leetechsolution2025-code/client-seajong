"use client";

import React, { useState, useEffect } from "react";
import { EmployeeTable } from "./EmployeeTable";
import { EmployeeFilter } from "./EmployeeFilter";
import { EmployeeDetailOffcanvas } from "./EmployeeDetailOffcanvas";
import CreateEmployeeModal from "./CreateEmployeeModal";
import { useToast } from "@/components/ui/Toast";

export function EmployeeManagement() {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("active");
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [search, department, status, page]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        department,
        status,
        page: page.toString(),
        pageSize: "12"
      });
      const res = await fetch(`/api/hr/employees?${params}`);
      const data = await res.json();
      setEmployees(data.employees || []);
      setTotalPages(data.totalPages || 1);
      if (data.departments) setDepartments(data.departments);
    } catch (error) {
      toast.error("Lỗi", "Không thể tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (emp: any) => {
    setSelectedEmployeeId(emp.id);
    setIsDetailOpen(true);
  };

  return (
    <div className="d-flex flex-column h-100 p-4">
      <EmployeeFilter
        search={search}
        onSearchChange={setSearch}
        department={department}
        onDepartmentChange={setDepartment}
        status={status}
        onStatusChange={setStatus}
        departments={departments}
        onAddClick={() => {
          setEditEmployeeId(null);
          setIsCreateModalOpen(true);
        }}
      />

      <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: 0 }}>
        <EmployeeTable
          employees={employees}
          loading={loading}
          onRowClick={handleRowClick}
          onEditClick={(emp) => {
            setEditEmployeeId(emp.id);
            setIsCreateModalOpen(true);
          }}
        />

        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-center mt-auto p-3 border-top bg-light bg-opacity-10">
          <div className="text-muted" style={{ fontSize: 12 }}>
            Hiển thị <b>{employees.length}</b> nhân sự
          </div>
          <div className="d-flex gap-1">
            <button
              className="btn btn-sm btn-light border-0 px-3 rounded-pill fw-bold"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Trước
            </button>
            <div className="d-flex align-items-center px-3 fw-bold" style={{ fontSize: 12 }}>
              Trang {page} / {totalPages}
            </div>
            <button
              className="btn btn-sm btn-light border-0 px-3 rounded-pill fw-bold"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <EmployeeDetailOffcanvas
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        employeeId={selectedEmployeeId}
      />

      {isCreateModalOpen && (
        <CreateEmployeeModal
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditEmployeeId(null);
          }}
          onCreated={() => {
            setIsCreateModalOpen(false);
            setEditEmployeeId(null);
            fetchEmployees();
          }}
          departments={departments}
          employeeId={editEmployeeId || undefined}
        />
      )}
    </div>
  );
}
