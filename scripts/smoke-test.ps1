param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $url = "$BaseUrl$Path"
  Write-Host "Testing $url"
  $response = Invoke-RestMethod -Uri $url -Method Get
  $response | ConvertTo-Json -Depth 8 | Write-Output
}

Invoke-Api -Path "/health"
Invoke-Api -Path "/api/companies"
Invoke-Api -Path "/api/companies/1"
Invoke-Api -Path "/api/companies/1/report-periods"
Invoke-Api -Path "/api/report-periods/1/balance-sheet"
Invoke-Api -Path "/api/report-periods/1/income-statement"
Invoke-Api -Path "/api/report-periods/1/cashflow-statement"
Invoke-Api -Path "/api/report-periods/1/operating-segments"
