# scheduler-setup.ps1
# Run this in PowerShell as Administrator to set up Task Scheduler

$TaskName = "ZoomPresenceBot"
$ScriptPath = "C:\zoom-bot\trigger.js"
$NodePath = "C:\Program Files\nodejs\node.exe"
$WorkingDir = "C:\zoom-bot"

# Remove existing task if it exists
schtasks /Delete /TN $TaskName /F 2>$null

# Create new task
schtasks /Create /TN $TaskName /SC WEEKLY `
    /D MON,TUE,WED,THU,FRI,SAT `
    /ST 08:45 `
    /TR "$NodePath `"$ScriptPath`"" `
    /RU $env:USERNAME `
    /RL HIGHEST `
    /F

Write-Host "Task '$TaskName' created successfully!"
Write-Host "Schedule: Mon-Sat at 8:45 AM IST"
Write-Host "Make sure $ScriptPath exists"
