import React from 'react';

interface FormLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

const FormLayout: React.FC<FormLayoutProps> = ({ 
  children, 
  title, 
  description, 
  className = '' 
}) => {
  return (
    <div className={`w-full max-w-md mx-auto card p-8 fade-in ${className}`}>
      {(title || description) && (
        <div className="mb-6 text-center">
          {title && <h1 className="text-2xl font-bold themed-header mb-2">{title}</h1>}
          {description && <p className="text-gray-600">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default FormLayout;