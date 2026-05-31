import api from './api';
import { CategoryResponse } from './category.service';
import { WalletResponse } from './wallet.service';

export interface TransactionRequest {
    amount: number;
    walletId: number;
    categoryId: number;
    type: 'INCOME' | 'EXPENSE';
    description: string;
    transactionDate: string; // ISO string
    imageUrl?: string;
    mood?: string;
}

export interface TransactionResponse {
    id: number;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description: string;
    transactionDate: string;
    category: CategoryResponse;
    wallet: WalletResponse;
    imageUrl?: string;
    mood?: string;
}

export const TransactionService = {
    getMyTransactions: async (): Promise<TransactionResponse[]> => {
        const response = await api.get('/transactions');
        return response.data.result;
    },

    createTransaction: async (data: TransactionRequest): Promise<TransactionResponse> => {
        const response = await api.post('/transactions', data);
        return response.data.result;
    },

    deleteTransaction: async (id: number): Promise<any> => {
        const response = await api.delete(`/transactions/${id}`);
        return response.data;
    },

    uploadImage: async (imageUri: string): Promise<string> => {
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'transaction_photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
            uri: imageUri,
            name: filename,
            type,
        } as any);

        const response = await api.post('/transactions/upload-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.result;
    }
};
