$ErrorActionPreference = "Stop"

$pgRoot = "C:\Program Files\PostgreSQL\17"
$binDir = Join-Path $pgRoot "bin"
$dataDir = Join-Path $pgRoot "data"
$password = "PgLocalTest!2026"
$databaseName = "company_research_tool_test"

$psql = Join-Path $binDir "psql.exe"
$pgIsReady = Join-Path $binDir "pg_isready.exe"
$pgCtl = Join-Path $binDir "pg_ctl.exe"

if (-not (Test-Path $psql)) {
  throw "psql.exe not found under $binDir"
}

if (-not (Test-Path $dataDir)) {
  throw "PostgreSQL data directory not found: $dataDir"
}

$env:PGPASSWORD = $password

try {
  & $pgIsReady -h localhost -p 5432 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "PostgreSQL is not accepting connections. Attempting pg_ctl start..."
    & $pgCtl start -D $dataDir -l (Join-Path $dataDir "log\startup.log")
    Start-Sleep -Seconds 3
  }

  $createSql = "SELECT 1 FROM pg_database WHERE datname = '$databaseName';"
  $exists = (& $psql -U postgres -h localhost -p 5432 -d postgres -t -A -c $createSql).Trim()

  if ($exists -ne "1") {
    Write-Host "Creating test database $databaseName..."
    & $psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE $databaseName;"
  } else {
    Write-Host "Test database $databaseName already exists."
  }

  Write-Host "Local PostgreSQL is ready."
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
