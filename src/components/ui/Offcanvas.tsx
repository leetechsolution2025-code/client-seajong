import React, { ReactNode, CSSProperties } from 'react';

interface OffcanvasProps {
  show: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: string;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
}

export function Offcanvas({ 
  show, 
  onClose, 
  title, 
  children, 
  width = '400px',
  bodyClassName = 'offcanvas-body d-flex flex-column p-0',
  bodyStyle = {}
}: OffcanvasProps) {
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
        style={{ width, zIndex: 1045, visibility: show ? 'visible' : 'hidden' }}
      >
        <div className="offcanvas-header border-bottom bg-light">
          <h6 className="offcanvas-title fw-bold mb-0">{title}</h6>
          <button type="button" className="btn-close shadow-none" onClick={onClose} aria-label="Close"></button>
        </div>
        
        <div className={bodyClassName} style={bodyStyle}>
          {children}
        </div>
      </div>
    </>
  );
}
