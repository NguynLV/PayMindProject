UPDATE Users SET IsActive=1 WHERE Email='admin@gmail.com';
DECLARE @uid INT;
SELECT @uid = UserId FROM Users WHERE Email='admin@gmail.com';
IF NOT EXISTS (SELECT 1 FROM Wallets WHERE UserId=@uid)
BEGIN
    INSERT INTO Wallets (UserId, Name, Balance, IsDefault, IsDeleted) VALUES (@uid, 'Vi Chinh', 500000000, 1, 0);
END
ELSE
BEGIN
    UPDATE Wallets SET Balance=500000000 WHERE UserId=@uid;
END
