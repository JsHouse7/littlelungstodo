import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  navigation: any[];
  profile: any;
  onSignOut: () => void;
}

export default function BottomNav({ activeTab, onTabChange, navigation, profile, onSignOut }: BottomNavProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const router = useRouter();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-around items-center h-16 lg:hidden">
        {/* Main navigation items (first 3) */}
        {navigation.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-700'}`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="text-xs font-medium">{item.name.split(' ')[0]}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none ${showMoreMenu ? 'text-blue-600' : 'text-gray-500 hover:text-blue-700'}`}
        >
          <Menu className={`w-6 h-6 mb-1 ${showMoreMenu ? 'text-blue-600' : 'text-gray-400'}`} />
          <span className="text-xs font-medium">More</span>
        </button>
      </nav>

      {/* More Menu Overlay */}
      {showMoreMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden" 
            onClick={() => setShowMoreMenu(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed bottom-16 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 lg:hidden">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {/* User icon */}
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {profile.full_name || profile.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize truncate">
                    {profile.role} {profile.department && ` • ${profile.department}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  router.push('/settings');
                }}
                className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <div className="text-left">
                  <div className="font-medium">Settings & Profile</div>
                  <div className="text-xs text-gray-500">
                    {profile.role === 'admin' ? 'Manage profile and users' : 'Manage your profile'}
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onSignOut();
                }}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                <div className="text-left">
                  <div className="font-medium">Sign Out</div>
                  <div className="text-xs text-red-500">End your session</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
} 