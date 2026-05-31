import api from './api';
import {
    AuthenticationRequest,
    AuthenticationResponse,
    ForgotPasswordRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerifyOtpRequest,
} from '@/types/auth';

const AuthService = {
    login: async (data: AuthenticationRequest): Promise<AuthenticationResponse> => {
        const response = await api.post<any>('/auth/token', data);
        return response.data.result;
    },

    register: async (data: RegisterRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('firstName', data.firstName);
        formData.append('lastName', data.lastName);
        formData.append('email', data.email);
        formData.append('password', data.password);
        if (data.birthday) formData.append('birthday', data.birthday);
        if (data.phone) {
            formData.append('phone', data.phone);
        }
        if (data.gender) formData.append('gender', data.gender);
        if (data.currency) formData.append('currency', data.currency);

        if (data.avatar) {
            // @ts-ignore
            formData.append('avatar', {
                uri: data.avatar.uri,
                name: 'avatar.jpg',
                type: 'image/jpeg',
            });
        }

        await api.post('/auth/register', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    verifyOtp: async (data: VerifyOtpRequest): Promise<AuthenticationResponse> => {
        const response = await api.post<any>('/auth/verify', data);
        return response.data.result;
    },

    resendOtp: async (email: string): Promise<void> => {
        await api.post('/auth/resend-otp', null, { params: { email } });
    },

    verifyResetOtp: async (data: VerifyOtpRequest): Promise<void> => {
        await api.post('/auth/verify-reset-otp', data);
    },

    loginWithGoogle: async (idToken: string): Promise<AuthenticationResponse> => {
        const response = await api.post<any>('/auth/google', { idToken });
        return response.data.result;
    },

    forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
        await api.post('/auth/forgot-password', data);
    },

    checkEmail: async (email: string): Promise<boolean> => {
        const response = await api.post<any>('/auth/check-email', { email });
        return response.data.result;
    },

    resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
        await api.post('/auth/reset-password', data);
    },

    refreshToken: async (token: string): Promise<AuthenticationResponse> => {
        const response = await api.post<any>('/auth/refresh', { token });
        return response.data.result;
    },
};

export default AuthService;
