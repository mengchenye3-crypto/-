$ErrorActionPreference = "Stop"

$databaseName = "company_research_tool_test"
$sqlFile = Join-Path $PSScriptRoot "init-test-database.sql"

Write-Host "Target test database: $databaseName"

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Host "psql was not found on this machine."
  Write-Host "Please create the test database manually with pgAdmin / DBeaver / Navicat using:"
  Write-Host "CREATE DATABASE $databaseName;"
  exit 1
}

Write-Host "psql detected. Attempting to create test database..."
psql -U postgres -h localhost -p 5432 -f $sqlFile
