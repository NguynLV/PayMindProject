import api from './api';

export interface BudgetResponse {
    id: number;
    categoryId?: number;
    categoryName: string;
    name: string;
    amount: number;
    spentAmount: number;
    alertThreshold: number;
    period: string;
    periodValue: number;
    year: number;
    isActive: boolean;
}

export interface BudgetRequest {
    categoryId?: number;
    name: string;
    amount: number;
    period: string;
    periodValue: number;
    year: number;
}

export const BudgetService = {
    getMyBudgets: async (): Promise<BudgetResponse[]> => {
        const response = await api.get('/budgets');
        return response.data.result;
    },

    createBudget: async (data: BudgetRequest): Promise<BudgetResponse> => {
        const response = await api.post('/budgets', data);
        return response.data.result;
    },

    updateBudget: async (id: number, data: BudgetRequest): Promise<BudgetResponse> => {
        const response = await api.put(`/budgets/${id}`, data);
        return response.data.result;
    },

    deleteBudget: async (id: number): Promise<void> => {
        await api.delete(`/budgets/${id}`);
    }
};
