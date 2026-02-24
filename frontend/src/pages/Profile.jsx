import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { userService, authService } from '../services';
import TopBar from '../components/layout/TopBar';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Loader';
import { getInitials, capitalize } from '../utils/helpers';
import { formatDate } from '../utils/dateUtils';

export default function Profile() {
    const { user, updateUser } = useAuth();
    const { success, error: showError } = useToast();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Change password state
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwLoading, setPwLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
        }
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await userService.updateProfile({ name: form.name, phone: form.phone });
            updateUser(data.data?.user || form);
            success('Profile updated');
            setEditing(false);
        } catch (err) {
            showError(err.response?.data?.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side validation
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            showError('Please select a JPEG, PNG, WebP, or GIF image');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showError('Image must be under 5 MB');
            return;
        }

        setUploading(true);
        try {
            const { data } = await userService.uploadAvatar(file);
            updateUser(data.data?.user);
            success('Avatar updated!');
        } catch (err) {
            showError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
            // Reset file input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Cloudinary returns full HTTPS URLs — no local prefix needed
    const avatarUrl = user?.avatar || null;

    if (!user) return <PageLoader />;

    const balance = user.leaveBalance || {};

    return (
        <>
            <TopBar title="Profile" />
            <div className="p-4 md:p-6 max-w-3xl mx-auto page-enter">
                {/* Profile Card */}
                <Card className="mb-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                        {/* Avatar with upload overlay */}
                        <div className="relative group flex-shrink-0">
                            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center text-accent text-2xl font-bold overflow-hidden">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={user.name} className="w-20 h-20 rounded-2xl object-cover" />
                                ) : (
                                    getInitials(user.name)
                                )}
                            </div>
                            {/* Upload overlay */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Upload photo"
                            >
                                {uploading ? (
                                    <div className="w-6 h-6 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                        <circle cx="12" cy="13" r="4" />
                                    </svg>
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-xl font-display text-txt-primary">{user.name}</h2>
                                <Badge variant="info">{capitalize(user.role)}</Badge>
                            </div>
                            <p className="text-sm text-txt-muted">{user.email}</p>
                            {user.department && (
                                <p className="text-xs text-txt-muted mt-1">Department: {user.department?.name || user.department}</p>
                            )}
                            <p className="text-xs text-txt-muted mt-0.5">Joined: {formatDate(user.joinDate || user.createdAt)}</p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="mt-2 text-xs text-accent hover:underline font-medium flex items-center gap-1"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                {uploading ? 'Uploading...' : 'Upload Photo'}
                            </button>
                        </div>
                        <Button
                            variant={editing ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setEditing(!editing)}
                        >
                            {editing ? 'Cancel' : 'Edit'}
                        </Button>
                    </div>
                </Card>

                {/* Edit Form */}
                {editing && (
                    <Card className="mb-6">
                        <CardTitle className="mb-4">Edit Profile</CardTitle>
                        <div className="space-y-4">
                            <Input
                                label="Full Name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                            <Input
                                label="Email"
                                value={form.email}
                                disabled
                                className="opacity-60"
                            />
                            <Input
                                label="Phone"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="+91 XXXXX XXXXX"
                            />
                            <div className="flex justify-end">
                                <Button onClick={handleSave} isLoading={saving}>Save Changes</Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Leave Balance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Leave Balance</CardTitle>
                    </CardHeader>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(balance).map(([type, value]) => (
                            <div key={type} className="p-3 bg-elevated rounded-lg border border-border/50">
                                <p className="text-xs text-txt-muted capitalize">{type}</p>
                                <p className="text-2xl font-bold font-display text-txt-primary mt-1">{value}</p>
                                <p className="text-[10px] text-txt-muted">days remaining</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-txt-muted mt-3">Total taken: {user.totalLeaveTaken || 0} day(s)</p>
                </Card>

                {/* Change Password */}
                <Card className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <CardTitle>Change Password</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowChangePassword(!showChangePassword)}
                        >
                            {showChangePassword ? 'Cancel' : 'Change'}
                        </Button>
                    </div>
                    {showChangePassword && (
                        <div className="space-y-4">
                            <Input
                                label="Current Password"
                                type="password"
                                value={pwForm.currentPassword}
                                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                                placeholder="Enter current password"
                            />
                            <Input
                                label="New Password"
                                type="password"
                                value={pwForm.newPassword}
                                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                                placeholder="Min 8 characters"
                            />
                            <Input
                                label="Confirm New Password"
                                type="password"
                                value={pwForm.confirmPassword}
                                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                                placeholder="Re-enter new password"
                            />
                            <div className="flex justify-end">
                                <Button
                                    isLoading={pwLoading}
                                    onClick={async () => {
                                        if (!pwForm.currentPassword || !pwForm.newPassword) {
                                            showError('All fields are required');
                                            return;
                                        }
                                        if (pwForm.newPassword.length < 8) {
                                            showError('New password must be at least 8 characters');
                                            return;
                                        }
                                        if (pwForm.newPassword !== pwForm.confirmPassword) {
                                            showError('Passwords do not match');
                                            return;
                                        }
                                        setPwLoading(true);
                                        try {
                                            await authService.changePassword({
                                                currentPassword: pwForm.currentPassword,
                                                newPassword: pwForm.newPassword,
                                            });
                                            success('Password changed successfully');
                                            setShowChangePassword(false);
                                            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                        } catch (err) {
                                            showError(err.response?.data?.message || 'Failed to change password');
                                        } finally {
                                            setPwLoading(false);
                                        }
                                    }}
                                >
                                    Update Password
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
}
