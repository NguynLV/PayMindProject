# PayMind AWS EC2 Deploy Script
# Usage: .\deploy.ps1 -EC2IP "your-ec2-public-ip"

param (
    [string]$EC2IP = ""
)

if ([string]::IsNullOrEmpty($EC2IP)) {
    $EC2IP = Read-Host "Nhập địa chỉ Public IP của AWS EC2 instance của bạn"
}

if ([string]::IsNullOrEmpty($EC2IP)) {
    Write-Error "IP máy chủ không được để trống!"
    exit 1
}

$KeyPath = "Nguynlvce181858.pem"
$Username = "ubuntu"

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "Bắt đầu quy trình Deploy PayMind Backend lên AWS EC2" -ForegroundColor Cyan
Write-Host "IP Máy chủ: $EC2IP" -ForegroundColor Yellow
Write-Host "--------------------------------------------------" -ForegroundColor Cyan

# 1. Cấu hình bảo mật file private key (.pem) trên Windows
Write-Host "[1/5] Đang cấu hình quyền bảo mật cho file private key..." -ForegroundColor Green
icacls.exe $KeyPath /reset
icacls.exe $KeyPath /grant:r "$($env:username):(R)"
icacls.exe $KeyPath /inheritance:r

# 2. Xây dựng gói JAR mới nhất
Write-Host "[2/5] Đang biên dịch và đóng gói JAR mới nhất..." -ForegroundColor Green
.\mvnw clean package -DskipTests
if ($LASTEXITCODE -ne 0) {
    Write-Error "Biên dịch thất bại! Vui lòng kiểm tra lại code."
    exit 1
}

# 3. Tạo thư mục và tải các tệp tin lên EC2 qua SCP
Write-Host "[3/5] Đang truyền tải các file cài đặt sang EC2..." -ForegroundColor Green

# Tạo thư mục app trên EC2 trước
ssh -i $KeyPath -o StrictHostKeyChecking=no "${Username}@${EC2IP}" "mkdir -p ~/paymind-app/AppQuanLiChiTieu target"

# Upload các file cấu hình và JAR
scp -i $KeyPath -o StrictHostKeyChecking=no target/AppQuanLiChiTieu-0.0.1-SNAPSHOT.jar "${Username}@${EC2IP}:~/paymind-app/AppQuanLiChiTieu/app.jar"
scp -i $KeyPath -o StrictHostKeyChecking=no Dockerfile "${Username}@${EC2IP}:~/paymind-app/AppQuanLiChiTieu/Dockerfile"
scp -i $KeyPath -o StrictHostKeyChecking=no docker-compose.yml "${Username}@${EC2IP}:~/paymind-app/docker-compose.yml"
scp -i $KeyPath -o StrictHostKeyChecking=no nginx.conf "${Username}@${EC2IP}:~/paymind-app/nginx.conf"

# Upload thư mục Web tĩnh (PayMind-Web)
ssh -i $KeyPath -o StrictHostKeyChecking=no "${Username}@${EC2IP}" "mkdir -p ~/paymind-app/PayMind-Web"
scp -i $KeyPath -o StrictHostKeyChecking=no -r ../../PayMind-Web/* "${Username}@${EC2IP}:~/paymind-app/PayMind-Web/"

# 4. SSH vào EC2 và thiết lập môi trường Docker
Write-Host "[4/5] Đang cấu hình Docker & Docker Compose trên EC2..." -ForegroundColor Green

$setupCommands = @"
# Cập nhật hệ thống
sudo apt-get update -y

# Cài đặt Docker nếu chưa có
if ! command -v docker &> /dev/null; then
    Write-Host "Đang cài đặt Docker..."
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=\$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker \`whoami\`
fi

# Cài đặt Docker Compose v2 nếu chưa có
if ! docker compose version &> /dev/null; then
    Write-Host "Đang cài đặt Docker Compose..."
    sudo apt-get install -y docker-compose-plugin
fi
"@

ssh -i $KeyPath -o StrictHostKeyChecking=no "${Username}@${EC2IP}" $setupCommands

# 5. Khởi động hệ thống
Write-Host "[5/5] Đang khởi chạy hệ thống Docker Compose trên EC2..." -ForegroundColor Green
$startCommands = @"
cd ~/paymind-app
# Sửa lại đường dẫn build và volume trong docker-compose cho phù hợp với môi trường chạy production
sed -i 's/build: .\/AppQuanLiChiTieu/image: paymind-app-backend\n    build:\n      context: .\n      dockerfile: AppQuanLiChiTieu\/Dockerfile/g' docker-compose.yml
sed -i 's/..\/..\/PayMind-Web/.\/PayMind-Web/g' docker-compose.yml

# Tắt các container cũ và khởi chạy bản mới
sudo docker compose down
sudo docker compose up -d --build
"@

ssh -i $KeyPath -o StrictHostKeyChecking=no "${Username}@${EC2IP}" $startCommands

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "Deploy hoàn tất thành công! 🎉⚡" -ForegroundColor Green
Write-Host "Máy chủ của bạn đã chạy tại: http://$EC2IP" -ForegroundColor Yellow
Write-Host "Đường dẫn API Webhook SePay: http://$EC2IP/QuanLiChiTieu/payments/sepay" -ForegroundColor Yellow
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
