Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root "public\icons"
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

function New-WirdIcon {
  param(
    [int]$Size,
    [string]$Path,
    [switch]$Maskable
  )

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $pad = if ($Maskable) { [int]($Size * 0.12) } else { 0 }
  $bg = New-Object System.Drawing.Rectangle($pad, $pad, ($Size - 2 * $pad), ($Size - 2 * $pad))
  $radius = [int]($Size * $(if ($Maskable) { 0.18 } else { 0.22 }))

  $regionPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  [void]$regionPath.AddArc($bg.X, $bg.Y, $d, $d, 180, 90)
  [void]$regionPath.AddArc($bg.Right - $d, $bg.Y, $d, $d, 270, 90)
  [void]$regionPath.AddArc($bg.Right - $d, $bg.Bottom - $d, $d, $d, 0, 90)
  [void]$regionPath.AddArc($bg.X, $bg.Bottom - $d, $d, $d, 90, 90)
  [void]$regionPath.CloseFigure()

  $green = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 41, 79, 61))
  $g.FillPath($green, $regionPath)

  $goldColor = [System.Drawing.Color]::FromArgb(255, 230, 189, 131)
  $penW = [Math]::Max(2, [int]($Size * 0.035))
  $pen = New-Object System.Drawing.Pen($goldColor, $penW)
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $inset = [int]($Size * $(if ($Maskable) { 0.24 } else { 0.28 }))
  $book = New-Object System.Drawing.Rectangle($inset, $inset, ($Size - 2 * $inset), ($Size - 2 * $inset))
  $g.DrawRectangle($pen, $book)

  $g.TranslateTransform([float]($Size / 2), [float]($Size / 2))
  $g.RotateTransform(45)
  $halfW = [int]($book.Width / 2)
  $halfH = [int]($book.Height / 2)
  $g.DrawRectangle($pen, -$halfW, -$halfH, $book.Width, $book.Height)
  $g.ResetTransform()

  $fontSize = [Math]::Max(10, [int]($Size * 0.34))
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $gold = New-Object System.Drawing.SolidBrush($goldColor)
  $center = New-Object System.Drawing.RectangleF(0, ($Size * 0.02), $Size, $Size)
  $g.DrawString([string][char]0x0648, $font, $gold, $center, $sf)

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $bmp.Dispose()
  $g.Dispose()
  $green.Dispose()
  $pen.Dispose()
  $gold.Dispose()
  $font.Dispose()
  $sf.Dispose()
  $regionPath.Dispose()
}

New-WirdIcon -Size 192 -Path (Join-Path $iconDir "icon-192.png")
New-WirdIcon -Size 512 -Path (Join-Path $iconDir "icon-512.png")
New-WirdIcon -Size 512 -Path (Join-Path $iconDir "icon-maskable-512.png") -Maskable
Get-ChildItem $iconDir | Select-Object Name, Length
