export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-sidebar border-t border-white/5 py-4 px-4 md:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <p className="text-sidebar-muted">
                    © {year} <span className="font-semibold text-sidebar-text">Leave Manager</span>
                </p>
                <div className="flex items-center gap-4 text-sidebar-muted">
                    <span>Employee Leave Management System</span>
                    <span className="hidden sm:inline opacity-40">•</span>
                    <span className="hidden sm:inline">v1.0</span>
                </div>
            </div>
        </footer>
    );
}
