SELECT 
    (SELECT COUNT(*) FROM Transactions WHERE UserId = 3) as TotalTransactions,
    (SELECT Balance FROM Wallets WHERE UserId = 3) as CurrentBalance;
GO
