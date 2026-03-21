import api from './api';

export interface CategoryStat {
    categoryId: number;
    categoryName: string;
    icon: string;
    color: string;
    amount: number;
    percentage: number;
}

export interface ReportSummaryResponse {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    incomeByCategory: CategoryStat[];
    expenseByCategory: CategoryStat[];
}

export interface DailyStat {
    day: number;
    totalIncome: number;
    totalExpense: number;
}

export interface YearlyReportResponse {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    months: {
        month: number;
        income: number;
        expense: number;
    }[];
    comparison: {
        previousYearTotal: number;
        percentageChange: number;
    };
    mainSecondaryBreakdown: {
        mainIncome: number;
        secondaryIncome: number;
        mainExpense: number;
        secondaryExpense: number;
    };
}

export const ReportService = {
    getMonthlySummary: async (month: number, year: number): Promise<ReportSummaryResponse> => {
        const response = await api.get('/reports/monthly', {
            params: { month, year }
        });
        return response.data.result;
    },

    getDailyStats: async (month: number, year: number): Promise<DailyStat[]> => {
        const response = await api.get('/reports/daily', {
            params: { month, year }
        });
        return response.data.result;
    },

    getYearlySummary: async (year: number): Promise<YearlyReportResponse> => {
        const response = await api.get('/reports/yearly', {
            params: { year }
        });
        return response.data.result;
    },

    getTransactionsByCategory: async (categoryId: number, month: number, year: number): Promise<any[]> => {
        const response = await api.get('/reports/category-transactions', {
            params: { categoryId, month, year }
        });
        return response.data.result;
    },
};

