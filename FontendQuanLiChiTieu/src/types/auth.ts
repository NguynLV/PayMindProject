import { Gender } from '@/constants/enums';

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    password: string;
    confirmPassword?: string;
    email: string;
    birthday: string; // YYYY-MM-DD
    currency: string;
    gender: Gender;
    phone: string;
    avatar?: any; // Start with any for file/blob, refine later if needed
}

export interface VerifyOtpRequest {
    email: string;
    otpCode: string;
}

export interface AuthenticationRequest {
    email: string;
    password: string;
}

export interface AuthenticationResponse {
    token: string;
    authenticated: boolean;
    isNewUser?: boolean;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    email: string;
    otpCode: string;
    newPassword: string;
    confirmNewPassword: string;
}
