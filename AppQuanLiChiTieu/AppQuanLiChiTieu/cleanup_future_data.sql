-- Delete future transactions for admin@gmail.com (UserId: 3)
-- Current Date: 2026-03-20
DELETE FROM Transactions 
WHERE UserId = 3 
AND TransactionDate > '2026-03-20 23:59:59';

-- Check the latest transaction date to confirm
SELECT MAX(TransactionDate) as LatestTransactionDate 
FROM Transactions 
WHERE UserId = 3;
GO
