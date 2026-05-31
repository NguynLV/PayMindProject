import api from './api';

export interface DiaryEntry {
  id: number;
  imageUrl: string | null;
  note: string | null;
  entryDate: string; // "YYYY-MM-DD"
  transactionId: number | null;
  transactionDescription: string | null;
  transactionType: string | null;
  transactionAmount: number | null;
  createdAt: string;
  updatedAt: string | null;
}

const diaryService = {
  /** Lấy tất cả nhật ký */
  getAll: async (): Promise<DiaryEntry[]> => {
    const res = await api.get('/diary');
    return res.data.result;
  },

  /** Lấy nhật ký theo tháng */
  getByMonth: async (year: number, month: number): Promise<DiaryEntry[]> => {
    const res = await api.get('/diary/month', { params: { year, month } });
    return res.data.result;
  },

  /** Chi tiết 1 nhật ký */
  getById: async (id: number): Promise<DiaryEntry> => {
    const res = await api.get(`/diary/${id}`);
    return res.data.result;
  },

  /** Tạo nhật ký mới (multipart/form-data) */
  create: async (params: {
    imageUri?: string;
    imageMime?: string;
    note?: string;
    entryDate?: string;
    transactionId?: number;
  }): Promise<DiaryEntry> => {
    const formData = new FormData();
    if (params.imageUri) {
      formData.append('image', {
        uri: params.imageUri,
        type: params.imageMime || 'image/jpeg',
        name: 'diary_photo.jpg',
      } as any);
    }
    if (params.note) formData.append('note', params.note);
    if (params.entryDate) formData.append('entryDate', params.entryDate);
    if (params.transactionId) formData.append('transactionId', String(params.transactionId));

    const res = await api.post('/diary', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.result;
  },

  /** Cập nhật ghi chú */
  update: async (id: number, note: string): Promise<DiaryEntry> => {
    const res = await api.put(`/diary/${id}`, null, { params: { note } });
    return res.data.result;
  },

  /** Xóa mềm */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/diary/${id}`);
  },
};

export default diaryService;
