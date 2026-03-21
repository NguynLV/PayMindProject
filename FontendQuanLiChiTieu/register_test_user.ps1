$body = @{
    firstName = "Admin"
    lastName = "System"
    email = "admin@gmail.com"
    password = "Admin@123"
    confirmPassword = "Admin@123"
    phone = "0123456789"
    currency = "VND"
    gender = "NAM"
    birthday = "2000-01-01"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://13.115.247.78/QuanLiChiTieu/auth/register" -Method Post -Body $body -ContentType "application/json"
