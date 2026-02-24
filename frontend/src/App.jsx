import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { SocketProvider } from './contexts/SocketContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ToastContainer from './components/ui/ToastContainer';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ApplyLeave from './pages/ApplyLeave';
import LeaveHistory from './pages/LeaveHistory';
import Profile from './pages/Profile';
import AIInsights from './pages/AIInsights';
import AuditLog from './pages/AuditLog';
import UserManagement from './pages/UserManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import HolidayManagement from './pages/HolidayManagement';
import Reimbursements from './pages/Reimbursements';
import MyLeaves from './pages/MyLeaves';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ui/ErrorBoundary';

export default function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <ToastProvider>
                        <SocketProvider>
                            <ToastContainer />
                            <ErrorBoundary>
                                <Routes>
                                    {/* Public Routes */}
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/forgot-password" element={<ForgotPassword />} />

                                    {/* Protected Routes — inside AppLayout with sidebar */}
                                    <Route
                                        element={
                                            <ProtectedRoute>
                                                <AppLayout />
                                            </ProtectedRoute>
                                        }
                                    >
                                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                        <Route path="/dashboard" element={<Dashboard />} />
                                        <Route path="/apply-leave" element={<ApplyLeave />} />
                                        <Route path="/leave-history" element={<LeaveHistory />} />
                                        <Route path="/profile" element={<Profile />} />
                                        <Route path="/ai-insights" element={<AIInsights />} />
                                        <Route path="/reimbursements" element={<Reimbursements />} />
                                        <Route path="/my-leaves" element={<MyLeaves />} />

                                        {/* Admin-only routes */}
                                        <Route
                                            path="/admin/users"
                                            element={
                                                <ProtectedRoute roles={['admin']}>
                                                    <UserManagement />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/departments"
                                            element={
                                                <ProtectedRoute roles={['admin']}>
                                                    <DepartmentManagement />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/admin/holidays"
                                            element={
                                                <ProtectedRoute roles={['admin']}>
                                                    <HolidayManagement />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/audit-log"
                                            element={
                                                <ProtectedRoute roles={['admin']}>
                                                    <AuditLog />
                                                </ProtectedRoute>
                                            }
                                        />
                                    </Route>

                                    {/* 404 Catch-all */}
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </ErrorBoundary>
                        </SocketProvider>
                    </ToastProvider>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}
