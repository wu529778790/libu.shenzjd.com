import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
  theme: 'festive' | 'solemn';
  className?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  theme, 
  className = '' 
}) => {
  const themeClass = theme === 'festive' ? 'theme-festive' : 'theme-solemn';
  
  return (
    <div className={`min-h-screen bg-gray-50 ${themeClass} ${className}`}>
      <div className="max-w-7xl mx-auto p-4">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;