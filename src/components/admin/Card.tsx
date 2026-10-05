import React from 'react';

interface CardProps {
  title?: string | React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, extra, children, className = '' }) => {
  return (
    <div className={`bg-white border border-[#EFE9DC] ${className}`}>
      {(title || extra) && (
        <div className="px-5 py-4 border-b border-[#EFE9DC] flex justify-between items-center gap-3">
          {title && (
            <h3 className="text-base font-extrabold text-[#1A1A17]" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>
              {title}
            </h3>
          )}
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};
