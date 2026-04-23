$bytes = New-Object Byte[] 64
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$secretKeyBase = [Convert]::ToBase64String($bytes)

Write-Host "Generated Secret Key Base: $secretKeyBase"

kubectl create secret generic plausible-secrets `
  --from-literal=secret-key-base=$secretKeyBase `
  -n screensprout `
  --dry-run=client -o yaml | kubectl apply -f -

Write-Host "Secret 'plausible-secrets' created successfully in namespace 'screensprout'."
