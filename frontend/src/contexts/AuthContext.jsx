import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

// Action types
const ACTIONS = {
    SET_LOADING: 'SET_LOADING',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGOUT: 'LOGOUT',
    UPDATE_USER: 'UPDATE_USER',
    SET_ERROR: 'SET_ERROR',
};

const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};

function authReducer(state, action) {
    switch (action.type) {
        case ACTIONS.SET_LOADING:
            return { ...state, isLoading: action.payload };
        case ACTIONS.LOGIN_SUCCESS:
            return { ...state, user: action.payload, isAuthenticated: true, isLoading: false, error: null };
        case ACTIONS.LOGOUT:
            return { ...initialState, isLoading: false };
        case ACTIONS.UPDATE_USER:
            return { ...state, user: { ...state.user, ...action.payload } };
        case ACTIONS.SET_ERROR:
            return { ...state, error: action.payload, isLoading: false };
        default:
            return state;
    }
}

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Check for existing session on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                dispatch({ type: ACTIONS.SET_LOADING, payload: false });
                return;
            }

            try {
                const { data } = await authService.getMe();
                dispatch({ type: ACTIONS.LOGIN_SUCCESS, payload: data.data?.user });
            } catch {
                localStorage.removeItem('accessToken');
                dispatch({ type: ACTIONS.LOGOUT });
            }
        };
        checkAuth();
    }, []);

    const login = useCallback(async (credentials) => {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });
        try {
            const { data } = await authService.login(credentials);
            localStorage.setItem('accessToken', data.data?.accessToken);
            dispatch({ type: ACTIONS.LOGIN_SUCCESS, payload: data.data?.user });
            return data;
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            dispatch({ type: ACTIONS.SET_ERROR, payload: message });
            throw error;
        }
    }, []);

    // Register now returns OTP requirement instead of auto-login
    const register = useCallback(async (userData) => {
        try {
            const { data } = await authService.register(userData);
            return data; // { userId, email, requiresOTP: true }
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed';
            dispatch({ type: ACTIONS.SET_ERROR, payload: message });
            throw error;
        }
    }, []);

    // Verify OTP — completes registration and logs in
    const verifyOTP = useCallback(async (email, otp) => {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });
        try {
            const { data } = await authService.verifyOTP({ email, otp });
            localStorage.setItem('accessToken', data.data?.accessToken);
            dispatch({ type: ACTIONS.LOGIN_SUCCESS, payload: data.data?.user });
            return data;
        } catch (error) {
            const message = error.response?.data?.message || 'OTP verification failed';
            dispatch({ type: ACTIONS.SET_ERROR, payload: message });
            throw error;
        }
    }, []);

    // Google OAuth — sign in or sign up
    const googleLogin = useCallback(async (credential) => {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });
        try {
            const { data } = await authService.googleAuth({ credential });
            localStorage.setItem('accessToken', data.data?.accessToken);
            dispatch({ type: ACTIONS.LOGIN_SUCCESS, payload: data.data?.user });
            return data;
        } catch (error) {
            const message = error.response?.data?.message || 'Google sign-in failed';
            dispatch({ type: ACTIONS.SET_ERROR, payload: message });
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch {
            // Logout errors are non-critical
        }
        localStorage.removeItem('accessToken');
        dispatch({ type: ACTIONS.LOGOUT });
    }, []);

    const updateUser = useCallback((updates) => {
        dispatch({ type: ACTIONS.UPDATE_USER, payload: updates });
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, register, verifyOTP, googleLogin, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
