import api from './api';

export interface DebtRequest {
    debtorName: string;
    phoneNumber?: string;
    amount?: number;
    itemType: 'CASH' | 'MILK_TEA' | 'COFFEE' | 'LUNCH' | 'OTHER';
    itemDescription?: string;
    type: 'LENT' | 'BORROWED';
    status: 'UNPAID' | 'PAID' | 'DEFAULTED';
    note?: string;
    dueDate?: string; // YYYY-MM-DD
}

export interface DebtResponse {
    id: number;
    ownerEmail: string;
    debtorName: string;
    phoneNumber?: string;
    amount?: number;
    itemType: 'CASH' | 'MILK_TEA' | 'COFFEE' | 'LUNCH' | 'OTHER';
    itemDescription?: string;
    type: 'LENT' | 'BORROWED';
    status: 'UNPAID' | 'PAID' | 'DEFAULTED';
    note?: string;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
}

export const DebtService = {
    getMyDebts: async (): Promise<DebtResponse[]> => {
        const response = await api.get('/debts');
        return response.data.result;
    },

    getDebtById: async (id: number): Promise<DebtResponse> => {
        const response = await api.get(`/debts/${id}`);
        return response.data.result;
    },

    createDebt: async (data: DebtRequest): Promise<DebtResponse> => {
        const response = await api.post('/debts', data);
        return response.data.result;
    },

    updateDebt: async (id: number, data: DebtRequest): Promise<DebtResponse> => {
        const response = await api.put(`/debts/${id}`, data);
        return response.data.result;
    },

    updateDebtStatus: async (id: number, status: 'UNPAID' | 'PAID' | 'DEFAULTED'): Promise<DebtResponse> => {
        const response = await api.put(`/debts/${id}/status?status=${status}`);
        return response.data.result;
    },

    deleteDebt: async (id: number): Promise<any> => {
        const response = await api.delete(`/debts/${id}`);
        return response.data;
    }
};
