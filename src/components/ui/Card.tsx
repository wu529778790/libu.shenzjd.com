import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hoverable = false 
}) => {
  const cardClasses = `bg-white rounded-xl shadow-md border border-gray-200 transition-all duration-300 ${
    hoverable ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer' : ''
  } ${className}`;
  
  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
};

export default Card;