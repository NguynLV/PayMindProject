-- Insert budgets for admin@gmail.com (UserId: 3)
-- CategoryIds: 1 (Ăn uống), 2 (Mua sắm), 3 (Đi lại)

DECLARE @UserId INT = 3;

-- March 2026 Budgets
INSERT INTO Budgets (UserId, CategoryId, Name, Amount, AlertThreshold, Period, PeriodValue, [Year], CreatedAt, IsActive)
VALUES (@UserId, NULL, N'Tổng chi tiêu tháng 3', 15000000, 80.00, 'Monthly', 3, 2026, GETDATE(), 1);

INSERT INTO Budgets (UserId, CategoryId, Name, Amount, AlertThreshold, Period, PeriodValue, [Year], CreatedAt, IsActive)
VALUES (@UserId, 1, N'Ngân sách ăn uống T3', 6000000, 85.00, 'Monthly', 3, 2026, GETDATE(), 1);

INSERT INTO Budgets (UserId, CategoryId, Name, Amount, AlertThreshold, Period, PeriodValue, [Year], CreatedAt, IsActive)
VALUES (@UserId, 2, N'Hạn mức mua sắm T3', 4000000, 70.00, 'Monthly', 3, 2026, GETDATE(), 1);

INSERT INTO Budgets (UserId, CategoryId, Name, Amount, AlertThreshold, Period, PeriodValue, [Year], CreatedAt, IsActive)
VALUES (@UserId, 3, N'Chi phí đi lại T3', 2000000, 90.00, 'Monthly', 3, 2026, GETDATE(), 1);


-- February 2026 Budgets (Historical)
INSERT INTO Budgets (UserId, CategoryId, Name, Amount, AlertThreshold, Period, PeriodValue, [Year], CreatedAt, IsActive)
VALUES (@UserId, NULL, N'Tổng chi tiêu tháng 2', 12000000, 80.00, 'Monthly', 2, 2026, GETDATE(), 1);

INSERT INTO Budgets (UserId, CategoryId, Name, Amount, AlertThreshold, Period, PeriodValue, [Year], CreatedAt, IsActive)
VALUES (@UserId, 1, N'Ăn uống tháng 2', 5000000, 80.00, 'Monthly', 2, 2026, GETDATE(), 1);

GO
