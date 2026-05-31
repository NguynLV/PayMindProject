import api from './api';
import { CategoryResponse } from './category.service';
import { WalletResponse } from './wallet.service';

export interface RecurringTransactionRequest {
    walletId: number;
    categoryId: number;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    cycle: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    nextRunDate: string; // YYYY-MM-DD
    isActive: boolean;
}

export interface RecurringTransactionResponse {
    id: number;
    ownerEmail: string;
    wallet: WalletResponse;
    category: CategoryResponse;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    cycle: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    nextRunDate: string; // YYYY-MM-DD
    isActive: boolean;
    createdAt: string;
}

export const RecurringService = {
    getMyRecurringTransactions: async (): Promise<RecurringTransactionResponse[]> => {
        const response = await api.get('/recurring');
        return response.data.result;
    },

    getRecurringTransactionById: async (id: number): Promise<RecurringTransactionResponse> => {
        const response = await api.get(`/recurring/${id}`);
        return response.data.result;
    },

    createRecurringTransaction: async (data: RecurringTransactionRequest): Promise<RecurringTransactionResponse> => {
        const response = await api.post('/recurring', data);
        return response.data.result;
    },

    updateRecurringTransaction: async (id: number, data: RecurringTransactionRequest): Promise<RecurringTransactionResponse> => {
        const response = await api.put(`/recurring/${id}`, data);
        return response.data.result;
    },

    deleteRecurringTransaction: async (id: number): Promise<any> => {
        const response = await api.delete(`/recurring/${id}`);
        return response.data;
    },

    triggerRecurringTransaction: async (id: number): Promise<RecurringTransactionResponse> => {
        const response = await api.post(`/recurring/${id}/trigger`);
        return response.data.result;
    }
};
