import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import CommandPalette from '../ui/CommandPalette';
import { cn } from '../../utils/cn';

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-base">
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />
            <main className={cn(
                'transition-all duration-300 min-h-screen flex flex-col',
                collapsed ? 'md:ml-16' : 'md:ml-60',
                'ml-0'
            )}>
                <div className="flex-1">
                    <Outlet context={{ onMenuClick: () => setMobileOpen(true) }} />
                </div>
                <Footer />
                <CommandPalette />
            </main>
        </div>
    );
}

