-- Insert notifications for admin@gmail.com (UserId: 3)

DECLARE @UserId INT = 3;

-- Notification 1: Threshold reached
INSERT INTO Notifications (UserId, Title, Content, Type, IsRead, CreatedAt)
VALUES (@UserId, N'Sắp chạm hạn mức: Ngân sách ăn uống T3', N'Chi tiêu cho Ăn uống đã đạt 92.5% ngân sách của bạn. Hãy cân đối lại chi tiêu nhé!', 'BUDGET_ALERT', 0, GETDATE());

-- Notification 2: Exceeded
INSERT INTO Notifications (UserId, Title, Content, Type, IsRead, CreatedAt)
VALUES (@UserId, N'Vượt ngân sách: Hạn mức mua sắm T3', N'Bạn đã chi tiêu vượt quá hạn mức 4.000.000đ cho danh mục Mua sắm. Tổng chi hiện tại là 4.250.000đ.', 'BUDGET_ALERT', 0, DATEADD(MINUTE, -30, GETDATE()));

GO
