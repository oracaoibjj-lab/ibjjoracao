$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1haHFsZ212Zm56YXdjdHBteXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODQ1MjQsImV4cCI6MjA5NTM2MDUyNH0.aj6D0jcSTvGBHcBWg97Q1Gp5jQH_QBZUYX1ctXrQ1C8"
$url = "https://mahqlgmvfnzawctpmyyi.supabase.co"

$h = @{
  "apikey" = $token
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

# Testar conexao
$res = Invoke-RestMethod -Uri "$url/rest/v1/reactions?limit=1" -Headers $h -Method GET
Write-Output "Conexao OK. Registros: $($res.Count)"
