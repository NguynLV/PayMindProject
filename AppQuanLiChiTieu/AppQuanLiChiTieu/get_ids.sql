SELECT u.UserId, w.WalletId 
FROM Users u 
JOIN Wallets w ON u.UserId = w.UserId 
WHERE u.Email = 'admin@gmail.com';
GO
