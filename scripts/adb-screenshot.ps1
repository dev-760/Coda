param(
    [string]$OutFile = "screenshot.png"
)

$adb = "C:\Users\Hassan\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$device = "192.168.1.2:42081"

& $adb connect $device | Out-Null
& $adb -s $device shell screencap -p /sdcard/screen.png
& $adb -s $device pull /sdcard/screen.png $OutFile
