import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();
    const { info, success, error } = useToast();

    useEffect(() => {
        if (!user) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const socketUrl = backendUrl.replace('/api', ''); // Socket connects to root, not /api

        const newSocket = io(socketUrl, {
            withCredentials: true,
            reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
            newSocket.emit('join', user._id);
        });

        // Listen for global notification events
        newSocket.on('newNotification', (data) => {
            info(data.title || 'New Notification');
            // We could dispatch an event here if we want other components to refetch
            window.dispatchEvent(new Event('app:newNotification'));
        });

        newSocket.on('leave:approved', (data) => {
            success('Your leave request was approved!');
            window.dispatchEvent(new Event('app:leaveStatusChanged'));
        });

        newSocket.on('leave:rejected', (data) => {
            error('Your leave request was rejected.');
            window.dispatchEvent(new Event('app:leaveStatusChanged'));
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user, info, success, error]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
