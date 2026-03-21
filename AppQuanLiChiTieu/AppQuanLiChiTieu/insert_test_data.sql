-- Insert transactions for admin@gmail.com (UserId: 3, WalletId: 3)
-- CategoryIds: 1 (Ăn uống), 2 (Mua sắm), 3 (Đi lại), 4 (Hóa đơn), 5 (Giải trí), 6 (Tiền lương), 7 (Tiền thưởng), 8 (Đầu tư)

DECLARE @UserId INT = 3;
DECLARE @WalletId INT = 3;
DECLARE @Year INT;
DECLARE @Month INT;
DECLARE @Day INT;
DECLARE @Date DATETIME;

-- 2025 Data
SET @Year = 2025;
SET @Month = 1;

WHILE @Month <= 12
BEGIN
    -- Salary (Income)
    INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
    VALUES (@UserId, @WalletId, 6, 'INCOME', 30000000, N'Lương tháng ' + CAST(@Month AS NVARCHAR), 'Completed', DATEFROMPARTS(@Year, @Month, 5), 0, GETDATE());

    -- Rent (Expense)
    INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
    VALUES (@UserId, @WalletId, 4, 'EXPENSE', 5000000, N'Tiền nhà tháng ' + CAST(@Month AS NVARCHAR), 'Completed', DATEFROMPARTS(@Year, @Month, 1), 0, GETDATE());

    -- Weekly Food & Transport
    SET @Day = 2;
    WHILE @Day <= 28
    BEGIN
        INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
        VALUES (@UserId, @WalletId, 1, 'EXPENSE', 200000 + (RAND() * 300000), N'Ăn uống hàng ngày', 'Completed', DATEFROMPARTS(@Year, @Month, @Day), 0, GETDATE());

        IF @Day % 3 = 0
        BEGIN
            INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
            VALUES (@UserId, @WalletId, 3, 'EXPENSE', 50000 + (RAND() * 100000), N'Xăng xe/Grab', 'Completed', DATEFROMPARTS(@Year, @Month, @Day), 0, GETDATE());
        END
        
        SET @Day = @Day + 2;
    END

    -- Monthly Entertainment
    INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
    VALUES (@UserId, @WalletId, 5, 'EXPENSE', 1000000 + (RAND() * 2000000), N'Giải trí cuối tháng ' + CAST(@Month AS NVARCHAR), 'Completed', DATEFROMPARTS(@Year, @Month, 25), 0, GETDATE());

    SET @Month = @Month + 1;
END

-- 2026 Data (up to now or full year for testing)
SET @Year = 2026;
SET @Month = 1;

WHILE @Month <= 12
BEGIN
    -- Salary (Income)
    INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
    VALUES (@UserId, @WalletId, 6, 'INCOME', 35000000, N'Lương tháng ' + CAST(@Month AS NVARCHAR) + ' 2026', 'Completed', DATEFROMPARTS(@Year, @Month, 5), 0, GETDATE());

    -- Rent (Expense)
    INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
    VALUES (@UserId, @WalletId, 4, 'EXPENSE', 5500000, N'Tiền nhà tháng ' + CAST(@Month AS NVARCHAR) + ' 2026', 'Completed', DATEFROMPARTS(@Year, @Month, 1), 0, GETDATE());

    -- Weekly Food & Transport
    SET @Day = 2;
    WHILE @Day <= 28
    BEGIN
        INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
        VALUES (@UserId, @WalletId, 1, 'EXPENSE', 250000 + (RAND() * 350000), N'Ăn uống hàng ngày 2026', 'Completed', DATEFROMPARTS(@Year, @Month, @Day), 0, GETDATE());

        IF @Day % 3 = 0
        BEGIN
            INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
            VALUES (@UserId, @WalletId, 3, 'EXPENSE', 60000 + (RAND() * 120000), N'Xăng xe 2026', 'Completed', DATEFROMPARTS(@Year, @Month, @Day), 0, GETDATE());
        END
        
        SET @Day = @Day + 2;
    END

    -- Bonus (Income) in June and December
    IF @Month = 6 OR @Month = 12
    BEGIN
        INSERT INTO Transactions (UserId, WalletId, CategoryId, Type, Amount, Description, Status, TransactionDate, IsDeleted, CreatedAt)
        VALUES (@UserId, @WalletId, 7, 'INCOME', 10000000, N'Thưởng nửa năm/năm 2026', 'Completed', DATEFROMPARTS(@Year, @Month, 30), 0, GETDATE());
    END

    SET @Month = @Month + 1;
END

-- Final balance update for the wallet to match a realistic scenario
UPDATE Wallets SET Balance = 250000000 WHERE WalletId = @WalletId;

GO
