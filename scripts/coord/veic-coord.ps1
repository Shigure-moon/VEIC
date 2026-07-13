param(
  [Parameter(Position = 0)]
  [ValidateSet("status", "list", "add", "claim", "start", "done", "block", "note", "report", "sync-api", "check")]
  [string]$Action = "status",

  [string]$TaskId = "",
  [string]$Owner = "",
  [string]$Title = "",
  [string]$Area = "soft",
  [string]$Note = "",
  [string]$Branch = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir "..\..")
$CoordDir = Join-Path $Root ".coord"
$TasksPath = Join-Path $CoordDir "tasks.json"
$ReportPath = Join-Path $CoordDir "PROJECT_STATUS.md"
$ServerDir = Join-Path $Root "server"
$SoftDir = Join-Path $Root "soft"

function NowIso {
  return (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
}

function Read-TasksState {
  if (!(Test-Path $TasksPath)) {
    New-Item -ItemType Directory -Force $CoordDir | Out-Null
    $initial = [ordered]@{
      version = 1
      updatedAt = NowIso
      tasks = @()
    }
    $initial | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $TasksPath
  }
  return Get-Content -Raw $TasksPath | ConvertFrom-Json
}

function Save-TasksState($state) {
  $state.updatedAt = NowIso
  $state | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $TasksPath
}

function Get-Task($state, [string]$id) {
  $task = @($state.tasks | Where-Object { $_.id -eq $id }) | Select-Object -First 1
  if (!$task) {
    throw "Task not found: $id"
  }
  return $task
}

function Add-Note($task, [string]$message) {
  if ([string]::IsNullOrWhiteSpace($message)) {
    return
  }
  $entry = "$(NowIso) $message"
  $notes = @()
  if ($task.notes) {
    $notes = @($task.notes)
  }
  $task.notes = @($notes + $entry)
}

function Update-Task([string]$status) {
  if ([string]::IsNullOrWhiteSpace($TaskId)) {
    throw "-TaskId is required"
  }
  $state = Read-TasksState
  $task = Get-Task $state $TaskId
  $task.status = $status
  $task.updatedAt = NowIso
  if (![string]::IsNullOrWhiteSpace($Owner)) {
    $task.owner = $Owner
  }
  if (![string]::IsNullOrWhiteSpace($Branch)) {
    $task.branch = $Branch
  }
  Add-Note $task $Note
  Save-TasksState $state
  Write-Host "$TaskId -> $status"
}

function Git-Summary([string]$path, [string]$label) {
  if (!(Test-Path (Join-Path $path ".git"))) {
    return "${label}: not a git repository"
  }
  $branch = git -C $path branch --show-current 2>$null
  $short = git -C $path status --short 2>$null
  $count = @($short | Where-Object { $_ }).Count
  return "${label}: branch=$branch changes=$count"
}

function Write-TaskTable($tasks) {
  $tasks |
    Sort-Object area, status, id |
    Format-Table id, area, status, owner, branch, title -AutoSize
}

function New-TaskId($tasks) {
  $max = 0
  foreach ($task in $tasks) {
    if ($task.id -match "^VEIC-(\d+)$") {
      $max = [Math]::Max($max, [int]$Matches[1])
    }
  }
  return "VEIC-{0:D3}" -f ($max + 1)
}

function Generate-Report {
  $state = Read-TasksState
  $tasks = @($state.tasks)
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("# VEIC Project Status")
  $lines.Add("")
  $lines.Add("Updated: $(NowIso)")
  $lines.Add("")
  $lines.Add("## Git")
  $lines.Add("")
  $lines.Add("- $(Git-Summary $Root 'meta')")
  $lines.Add("- $(Git-Summary $ServerDir 'server')")
  $lines.Add("")
  $lines.Add("## Task Counts")
  $lines.Add("")
  foreach ($status in @("todo", "claimed", "in_progress", "blocked", "done")) {
    $count = @($tasks | Where-Object { $_.status -eq $status }).Count
    $lines.Add("- ${status}: $count")
  }
  $lines.Add("")
  $lines.Add("## Active Tasks")
  $lines.Add("")
  foreach ($task in $tasks | Where-Object { $_.status -in @("claimed", "in_progress", "blocked") } | Sort-Object area, id) {
    $lines.Add("- $($task.id) [$($task.area)/$($task.status)] $($task.title) owner=$($task.owner)")
  }
  $lines.Add("")
  $lines.Add("## Next Todo")
  $lines.Add("")
  foreach ($task in $tasks | Where-Object { $_.status -eq "todo" } | Select-Object -First 10) {
    $lines.Add("- $($task.id) [$($task.area)] $($task.title)")
  }
  $lines.Add("")
  $lines | Set-Content -Encoding UTF8 $ReportPath
  Write-Host "Wrote $ReportPath"
}

switch ($Action) {
  "status" {
    Write-Host (Git-Summary $Root "meta")
    Write-Host (Git-Summary $ServerDir "server")
    $state = Read-TasksState
    Write-TaskTable @($state.tasks | Where-Object { $_.status -ne "done" })
  }
  "list" {
    $state = Read-TasksState
    Write-TaskTable @($state.tasks)
  }
  "add" {
    if ([string]::IsNullOrWhiteSpace($Title)) {
      throw "-Title is required"
    }
    $state = Read-TasksState
    $id = if ([string]::IsNullOrWhiteSpace($TaskId)) { New-TaskId @($state.tasks) } else { $TaskId }
    $task = [ordered]@{
      id = $id
      title = $Title
      area = $Area
      status = "todo"
      owner = $Owner
      branch = $Branch
      updatedAt = NowIso
      checks = @()
      notes = @()
    }
    if (![string]::IsNullOrWhiteSpace($Note)) {
      $task.notes = @("$(NowIso) $Note")
    }
    $state.tasks = @($state.tasks) + $task
    Save-TasksState $state
    Write-Host "Added $id"
  }
  "claim" {
    Update-Task "claimed"
  }
  "start" {
    Update-Task "in_progress"
  }
  "done" {
    Update-Task "done"
  }
  "block" {
    Update-Task "blocked"
  }
  "note" {
    if ([string]::IsNullOrWhiteSpace($TaskId) -or [string]::IsNullOrWhiteSpace($Note)) {
      throw "-TaskId and -Note are required"
    }
    $state = Read-TasksState
    $task = Get-Task $state $TaskId
    $task.updatedAt = NowIso
    Add-Note $task $Note
    Save-TasksState $state
    Write-Host "Noted $TaskId"
  }
  "report" {
    Generate-Report
  }
  "sync-api" {
    Push-Location $SoftDir
    try {
      npm run generate:api
    } finally {
      Pop-Location
    }
  }
  "check" {
    switch ($Area) {
      "soft" {
        Push-Location $SoftDir
        try { npm run check } finally { Pop-Location }
      }
      "server" {
        Push-Location $ServerDir
        try { cargo test --test backend_contract -- --nocapture } finally { Pop-Location }
      }
      "all" {
        Push-Location $SoftDir
        try { npm run check } finally { Pop-Location }
        Push-Location $ServerDir
        try { cargo test --test backend_contract -- --nocapture } finally { Pop-Location }
      }
      default {
        throw "Unsupported -Area '$Area'. Use soft, server, or all."
      }
    }
  }
}
