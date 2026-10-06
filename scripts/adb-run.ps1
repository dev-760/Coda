param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$AdbArgs
)

$adb = "C:\Users\Hassan\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$device = "192.168.1.2:42081"

# Ensure connected
& $adb connect $device | Out-Null

# Execute adb command
if ($AdbArgs) {
    & $adb -s $device @AdbArgs
} else {
    & $adb -s $device get-state
}
