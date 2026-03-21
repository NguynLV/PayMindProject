import api from './api';

export interface UserProfile {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    birthday?: string;
    avatarUrl?: string;
    currency: string;
    gender?: string;
}

export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
    birthday?: string;   
    gender?: string;    
    currency?: string;  
}

interface ApiResponse<T> {
    code: number;
    message?: string;
    result: T;
}

const UserService = {
    getMyProfile: async (): Promise<UserProfile> => {
        const response = await api.get<ApiResponse<UserProfile>>('/users/me');
        return response.data.result;
    },

    updateMyProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
        const response = await api.put<ApiResponse<UserProfile>>('/users/me', data);
        return response.data.result;
    },

    uploadAvatar: async (asset: { uri: string; mimeType?: string }): Promise<string> => {
        const formData = new FormData();
        // @ts-ignore — same pattern as auth.service.ts register
        formData.append('file', {
            uri: asset.uri,
            name: 'avatar.jpg',
            type: asset.mimeType ?? 'image/jpeg',
        });
        const response = await api.post<ApiResponse<string>>('/users/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.result;
    },
};

export default UserService;
