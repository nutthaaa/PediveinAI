import React from 'react';
import bdmsLogoImg from '../assets/bdms-logo.png';

interface BDMSLogoProps {
  className?: string;
}

export const BDMSLogo: React.FC<BDMSLogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={bdmsLogoImg}
        alt="BDMS - Bangkok Dusit Medical Services"
        className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm brightness-110 contrast-105"
      />
    </div>
  );
};
