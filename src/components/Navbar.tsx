"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="bg-navy-800 text-white border-b border-navy-700 w-full">
      <div 
        className="container mx-auto px-4 md:px-6 overflow-x-scroll overflow-y-hidden nav-scroll-container"
        style={{
          WebkitOverflowScrolling: 'touch',
          height: '56px', /* 固定高度，等于h-14 */
          maxHeight: '56px',
          display: 'block'
        }}
      >
        <div className="dashboard-tabs flex h-14 min-w-max"
          style={{
            height: '56px'
          }}
        >
          <Link 
            href="/" 
            className={`dashboard-tab ${
              isActive("/") 
                ? "dashboard-tab-active" 
                : ""
            }`}
          >
            Overview
          </Link>
          <Link 
            href="/portfolio" 
            className={`dashboard-tab ${
              isActive("/portfolio") 
                ? "dashboard-tab-active" 
                : ""
            }`}
          >
            Portfolio Details
          </Link>
          <Link 
            href="/documents" 
            className={`dashboard-tab ${
              isActive("/documents") 
                ? "dashboard-tab-active" 
                : ""
            }`}
          >
            Documents
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar; 