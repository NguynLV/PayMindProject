import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Use a helper to get the Notifications module only when needed
const getNotifications = () => {
    if (Constants.appOwnership === 'expo') return null;
    return require('expo-notifications');
};

/**
 * Configure how notifications are displayed when the app is in the foreground
 * Only run this if NOT in Expo Go
 */
if (Constants.appOwnership !== 'expo') {
    const Notifications = getNotifications();
    if (Notifications) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    }
}

export const NotificationLocalService = {
    /**
     * Request permissions and schedule a daily reminder at 20:00 (8 PM)
     */
    scheduleDailyReminder: async () => {
        const Notifications = getNotifications();
        if (!Notifications || Constants.appOwnership === 'expo') {
            console.warn('Notifications are disabled in Expo Go on SDK 53+. Use a Development Build for full functionality.');
            return;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // Only request if not already granted
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for daily reminder!');
                return;
            }

            // Cancel all existing scheduled notifications to avoid duplicates
            await Notifications.cancelAllScheduledNotificationsAsync();

            // Schedule for 8 PM (20:00) daily
            const id = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Nhắc nhở nhập thu chi 💰",
                    body: "Hôm nay bạn có chi tiêu gì không? Đừng quên ghi lại để quản lý tài chính tốt hơn nhé!",
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: 19,
                    minute: 30,
                },
            });

            console.log('Daily reminder scheduled:', id);
        } catch (error) {
            console.error('Error scheduling daily reminder:', error);
        }
    },

    /**
     * Utility for testing - schedule a notification for 5 seconds from now
     */
    scheduleTestNotification: async () => {
        const Notifications = getNotifications();
        if (!Notifications || Constants.appOwnership === 'expo') {
            console.warn('Notifications are disabled in Expo Go.');
            return;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Test Thông báo 🔔",
                body: "Đây là thông báo kiểm tra!",
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 5,
            },
        });
    }
};
