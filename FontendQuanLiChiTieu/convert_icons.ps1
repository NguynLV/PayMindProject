$sourcePath = "c:\ProjectEXE\PayMind-Web\logo.png"
$targetIcon = "c:\ProjectEXE\FontendQuanLiChiTieu\src\assets\images\icon.png"
$targetForeground = "c:\ProjectEXE\FontendQuanLiChiTieu\src\assets\images\android-icon-foreground.png"
$targetSplash = "c:\ProjectEXE\FontendQuanLiChiTieu\src\assets\images\splash-icon.png"

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($sourcePath)
$size = [math]::Max($img.Width, $img.Height)

# Create a square bitmap
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)

# Draw image centered
$x = [math]::Round(($size - $img.Width) / 2)
$y = [math]::Round(($size - $img.Height) / 2)
$g.DrawImage($img, $x, $y, $img.Width, $img.Height)

# Save as true PNG
$bmp.Save($targetIcon, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($targetForeground, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($targetSplash, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$img.Dispose()

Write-Host "Icons successfully converted and padded to square PNGs!"
