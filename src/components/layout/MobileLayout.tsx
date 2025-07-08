import React from 'react';

interface MobileLayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  bottomNav?: React.ReactNode;
}

export default function MobileLayout({ header, children, bottomNav }: MobileLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden w-full">
        {header}
      </div>
      {/* Main Content */}
      <div className="flex-1 w-full pb-16 lg:pb-0">
        {children}
      </div>
      {/* Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        {bottomNav}
      </div>
    </div>
  );
} 