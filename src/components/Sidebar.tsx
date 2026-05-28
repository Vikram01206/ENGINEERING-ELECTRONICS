import React from 'react';
import { ShoppingBag, FilePlus2, History, Settings } from 'lucide-react';
import { ShopDetails } from '../types';
import StreetLampIcon from './StreetLampIcon';

interface SidebarProps {
  activeTab: 'products' | 'new_invoice' | 'history' | 'settings';
  setActiveTab: (tab: 'products' | 'new_invoice' | 'history' | 'settings') => void;
  shopDetails: ShopDetails;
}

export default function Sidebar({ activeTab, setActiveTab, shopDetails }: SidebarProps) {
  const menuItems = [
    {
      id: 'products' as const,
      label: 'Products Catalog',
      desc: 'SKUs, Pricing & Stock',
      icon: ShoppingBag
    },
    {
      id: 'new_invoice' as const,
      label: 'New Invoice',
      desc: 'Build billing & tax details',
      icon: FilePlus2
    },
    {
      id: 'history' as const,
      label: 'Billing History',
      desc: 'Archive, re-print & ledger',
      icon: History
    },
    {
      id: 'settings' as const,
      label: 'Store Profile',
      desc: 'GST details & data backups',
      icon: Settings
    }
  ];

  return (
    <aside
      id="billing-sidebar-main"
      className="w-64 bg-slate-800 flex flex-col justify-between h-screen shrink-0 sticky top-0 border-r border-slate-700 select-none no-print shadow-lg"
    >
      <div>
        {/* Luxury Shop Branding Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="bg-[#B40023] text-white p-1.5 rounded-lg shadow-md flex items-center justify-center">
              <StreetLampIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-serif text-xl font-bold tracking-tight leading-none">
                ENGINEERING <span className="text-[#B40023]">ENTERPRISE</span>
              </h1>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1 font-sans font-semibold">
                Professional Billing v2.0
              </p>
            </div>
          </div>
          {shopDetails.address && (
            <div className="mt-3">
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed truncate max-w-full" title={shopDetails.address}>
                {shopDetails.address}
              </p>
            </div>
          )}
        </div>

        {/* Navigation Stack */}
        <nav id="sidebar-nav-stack" className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                id={`sidebar-link-${item.id}`}
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-[#B40023] text-white font-semibold shadow-md'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 duration-250 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm tracking-wide leading-snug font-sans">{item.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-red-100/80' : 'text-slate-450 group-hover:text-slate-300'
                    }`}
                  >
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Operator Metadata Panel */}
      <div className="p-6 bg-slate-900 border-t border-slate-950">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#B40023] flex items-center justify-center text-white font-bold text-xs shadow-md">
            EE
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white font-semibold font-serif tracking-wide leading-tight">ENGINEERING ENTERPRISE</p>
            <p className="text-[10px] text-slate-500 font-sans mt-0.5 font-medium">Terminal #01 • Offline</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
