import api from './api';

export interface BudgetSuggestion {
    categoryId: number;
    categoryName: string;
    suggestedAmount: number;
    reason: string;
}

export interface AiParseResponse {
    intent: 'TRANSACTION' | 'REPORT';
    type: 'INCOME' | 'EXPENSE' | null;
    amount: number | null;
    category: string | null;
    description: string | null;
    walletIntent: 'CASH' | 'BANK' | null;
    reportParams?: {
        viewMode: 'monthly' | 'yearly';
        month: number;
        year: number;
    };
}

export const AiService = {
    chat: async (message: string, categories?: string[]): Promise<AiParseResponse> => {
        const response = await api.post('/ai/chat', { message, categories });
        return response.data.result;
    },

    scanReceipt: async (base64Data: string, mimeType: string, categories?: string[]): Promise<AiParseResponse> => {
        const response = await api.post('/ai/scan-receipt', { base64Data, mimeType, categories });
        return response.data.result;
    },

    getReportInsight: async (reportData: any, month: number, year: number): Promise<{ insights: string[] }> => {
        const response = await api.post('/ai/report-insight', { reportData, month, year });
        return response.data.result;
    },
    
    suggestBudgets: async (): Promise<{ suggestions: BudgetSuggestion[] }> => {
        const response = await api.get('/ai/budget-suggestion');
        return response.data.result;
    }
};
