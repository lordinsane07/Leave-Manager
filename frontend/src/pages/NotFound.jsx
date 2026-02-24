import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-base p-6">
            <div className="text-center">
                <h1 className="text-8xl font-display text-accent mb-4">404</h1>
                <h2 className="text-xl font-semibold text-txt-primary mb-2">Page Not Found</h2>
                <p className="text-sm text-txt-muted mb-6">The page you're looking for doesn't exist or has been moved.</p>
                <Link to="/dashboard">
                    <Button>Back to Dashboard</Button>
                </Link>
            </div>
        </div>
    );
}
