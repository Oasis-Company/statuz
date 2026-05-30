Add-Type -AssemblyName System.Drawing

$size = 128
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

$graphics.Clear([System.Drawing.Color]::Transparent)

$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(66, 133, 244))
$graphics.FillEllipse($brush, 10, 10, 108, 108)

$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.FillEllipse($whiteBrush, 20, 20, 88, 88)

$blueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(66, 133, 244))
$graphics.FillEllipse($blueBrush, 30, 30, 68, 68)

$graphics.FillEllipse($whiteBrush, 50, 50, 28, 28)

$font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF(0, $size - 25, $size, 20)
$graphics.DrawString("S", $font, $blueBrush, $rect, $sf)

$graphics.Dispose()
$brush.Dispose()
$whiteBrush.Dispose()
$blueBrush.Dispose()
$font.Dispose()

$outputPath = "E:\ceaserzhao\github projects\statuz\packages\vscode-extension\resources\icon.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

Write-Host "Icon created at: $outputPath"
