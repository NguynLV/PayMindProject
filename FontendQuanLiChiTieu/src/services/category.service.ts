import api from './api';

export interface CategoryResponse {
    id: number;
    name: string;
    icon: string;
    color: string;
    type: string;
    isMain: boolean;
}

export interface CategoryRequest {
    name: string;
    icon: string;
    color: string;
    type: 'INCOME' | 'EXPENSE';
    isMain?: boolean;
}

export const CategoryService = {
    getMyCategories: async (type?: 'INCOME' | 'EXPENSE'): Promise<CategoryResponse[]> => {
        const response = await api.get('/categories', {
            params: { type }
        });
        return response.data.result;
    },

    createCategory: async (data: CategoryRequest): Promise<CategoryResponse> => {
        const response = await api.post('/categories', data);
        return response.data.result;
    },

    updateCategory: async (id: number, data: CategoryRequest): Promise<CategoryResponse> => {
        const response = await api.put(`/categories/${id}`, data);
        return response.data.result;
    },

    deleteCategory: async (id: number): Promise<string> => {
        const response = await api.delete(`/categories/${id}`);
        return response.data.result;
    }
};
