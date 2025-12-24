import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  title, 
  subtitle, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-center min-h-screen bg-gray-50 ${className}`}>
      <div className="w-full max-w-4xl mx-4">
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && <h1 className="text-3xl font-bold themed-header mb-2">{title}</h1>}
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default PageLayout;