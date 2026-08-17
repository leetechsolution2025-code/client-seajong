import React from 'react';
import { Pagination } from './Pagination';

export interface TableFooterProps {
  currentCount: number;
  totalCount: number;
  itemName?: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const TableFooter = ({
  currentCount,
  totalCount,
  itemName = "mục",
  page,
  totalPages,
  onPageChange,
  className = "px-4 py-1 bg-white",
}: TableFooterProps) => {
  return (
    <div className={`d-flex align-items-center justify-content-between w-100 m-0 ${className}`}>
      <small className="text-muted m-0 p-0">
        Hiển thị <b>{currentCount}/{totalCount}</b> {itemName}
      </small>
      <Pagination 
        page={page}
        totalPages={totalPages}
        onChange={onPageChange}
      />
    </div>
  );
};
