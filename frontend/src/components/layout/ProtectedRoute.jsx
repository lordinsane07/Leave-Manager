import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from '../ui/Loader';

export default function ProtectedRoute({ children, roles }) {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) return <PageLoader />;

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // Check role authorization if roles are specified
    if (roles && !roles.includes(user?.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
