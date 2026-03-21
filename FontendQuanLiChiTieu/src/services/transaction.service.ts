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
}

export interface TransactionResponse {
    id: number;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description: string;
    transactionDate: string;
    category: CategoryResponse;
    wallet: WalletResponse;
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
    }
};
