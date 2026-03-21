import api from './api';

export interface WalletResponse {
    id: number;
    name: string;
    balance: number;
    type: string;
    isDefault: boolean;
}

export interface WalletRequest {
    name: string;
    balance: number;
}

export const WalletService = {
    getMyWallets: async (): Promise<WalletResponse[]> => {
        const response = await api.get('/wallets');
        return response.data.result;
    },

    createWallet: async (data: WalletRequest): Promise<WalletResponse> => {
        const response = await api.post('/wallets', data);
        return response.data.result;
    },

    updateWallet: async (id: number, data: WalletRequest): Promise<WalletResponse> => {
        const response = await api.put(`/wallets/${id}`, data);
        return response.data.result;
    },

    deleteWallet: async (id: number): Promise<void> => {
        await api.delete(`/wallets/${id}`);
    }
};
