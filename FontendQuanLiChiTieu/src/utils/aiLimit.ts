import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ai_daily_usage';
export const DAILY_FREE_LIMIT = 3;

interface UsageData {
    date: string; // YYYY-MM-DD
    count: number;
}

const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const AiLimitService = {
    /**
     * Get the usage statistics for today.
     * @param isPremium whether the user has active premium status
     */
    getUsageStats: async (isPremium: boolean) => {
        if (isPremium) {
            return {
                allowed: true,
                count: 0,
                limit: DAILY_FREE_LIMIT,
                isPremium: true
            };
        }

        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const todayStr = getTodayDateString();

            if (!raw) {
                return {
                    allowed: true,
                    count: 0,
                    limit: DAILY_FREE_LIMIT,
                    isPremium: false
                };
            }

            const data: UsageData = JSON.parse(raw);
            if (data.date !== todayStr) {
                // It's a new day, count resets to 0
                return {
                    allowed: true,
                    count: 0,
                    limit: DAILY_FREE_LIMIT,
                    isPremium: false
                };
            }

            return {
                allowed: data.count < DAILY_FREE_LIMIT,
                count: data.count,
                limit: DAILY_FREE_LIMIT,
                isPremium: false
            };
        } catch (error) {
            console.error('Error reading AI usage statistics:', error);
            // Default to allowing the operation if storage fails so as not to break the app
            return {
                allowed: true,
                count: 0,
                limit: DAILY_FREE_LIMIT,
                isPremium: false
            };
        }
    },

    /**
     * Increments the AI usage counter for today (only if user is not premium).
     */
    incrementUsage: async (isPremium: boolean): Promise<number> => {
        if (isPremium) return 0;

        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const todayStr = getTodayDateString();
            let newCount = 1;

            if (raw) {
                const data: UsageData = JSON.parse(raw);
                if (data.date === todayStr) {
                    newCount = data.count + 1;
                }
            }

            const updatedData: UsageData = {
                date: todayStr,
                count: newCount
            };

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
            return newCount;
        } catch (error) {
            console.error('Error saving AI usage statistics:', error);
            return 0;
        }
    }
};
