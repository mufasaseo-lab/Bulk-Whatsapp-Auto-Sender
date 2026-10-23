$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path 'extension\icons' | Out-Null

foreach ($size in @(16, 32, 48, 128)) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $radius = [int]($size * 0.24)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc(0, 0, $radius, $radius, 180, 90)
  $path.AddArc($size - $radius, 0, $radius, $radius, 270, 90)
  $path.AddArc($size - $radius, $size - $radius, $radius, $radius, 0, 90)
  $path.AddArc(0, $size - $radius, $radius, $radius, 90, 90)
  $path.CloseFigure()

  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    ([System.Drawing.Point]::new(0, 0)),
    ([System.Drawing.Point]::new($size, $size)),
    ([System.Drawing.Color]::FromArgb(255, 20, 184, 166)),
    ([System.Drawing.Color]::FromArgb(255, 124, 58, 237)))
  $graphics.FillPath($brush, $path)

  $font = New-Object System.Drawing.Font('Segoe UI', ($size * 0.62), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString('W', $font, [System.Drawing.Brushes]::White, [System.Drawing.RectangleF]::new(0, -$size * 0.04, $size, $size), $format)

  $bitmap.Save((Join-Path 'extension\icons' "icon$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $format.Dispose(); $font.Dispose(); $brush.Dispose(); $path.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
