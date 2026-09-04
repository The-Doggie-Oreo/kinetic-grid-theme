# Publish Fall and Halloween drop collections with theme templates
param(
  [string]$Store = 'm3edqt-yw.myshopify.com'
)

$shopify = Join-Path $env:APPDATA 'npm\shopify.cmd'
if (-not (Test-Path $shopify)) { $shopify = 'npx' }
$onlineStorePublication = 'gid://shopify/Publication/174884323488'

$drops = @(
  @{ handle = 'fall-drop'; id = 'gid://shopify/Collection/689751097504'; template = 'fall-drop' },
  @{ handle = 'halloween-drop'; id = 'gid://shopify/Collection/689750638752'; template = 'halloween-drop' }
)

function Invoke-StoreGraphql {
  param([string]$Query, [hashtable]$Variables)

  $varFile = Join-Path $env:TEMP 'kg-season-pub-vars.json'
  $queryFile = Join-Path $env:TEMP 'kg-season-pub-query.graphql'
  $json = if ($Variables.Count -eq 0) { '{}' } else { $Variables | ConvertTo-Json -Depth 10 -Compress }
  [System.IO.File]::WriteAllText($queryFile, $Query)
  [System.IO.File]::WriteAllText($varFile, $json)
  if ($shopify -eq 'npx') {
    $out = npx --yes @shopify/cli store execute --store $Store --allow-mutations --query-file $queryFile --variable-file $varFile --json 2>&1
  } else {
    $out = & $shopify store execute --store $Store --allow-mutations --query-file $queryFile --variable-file $varFile --json 2>&1
  }
  $text = ($out | Out-String).Trim()
  if ($text -match '(?s)(\{[\s\S]*\})\s*$') { $text = $Matches[1] }
  if ($LASTEXITCODE -ne 0 -and $text -notmatch '^\{') { throw $text }
  $parsed = $text | ConvertFrom-Json
  if ($parsed.PSObject.Properties.Name -contains 'data') { return $parsed.data }
  if ($parsed.PSObject.Properties.Name -contains 'errors') { throw ($parsed.errors | ConvertTo-Json -Depth 5) }
  return $parsed
}

$updateCollection = @'
mutation UpdateCollection($input: CollectionInput!) {
  collectionUpdate(input: $input) {
    collection { id handle templateSuffix }
    userErrors { field message }
  }
}
'@

$publishMutation = @'
mutation Publish($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    publishable { ... on Collection { handle templateSuffix } }
    userErrors { field message }
  }
}
'@

foreach ($drop in $drops) {
  Write-Host "Setting template $($drop.template) on $($drop.handle)..."
  $res = Invoke-StoreGraphql -Query $updateCollection -Variables @{
    input = @{ id = $drop.id; templateSuffix = $drop.template }
  }
  if (@($res.collectionUpdate.userErrors).Count -gt 0) {
    throw ($res.collectionUpdate.userErrors | ConvertTo-Json)
  }

  Write-Host "Publishing $($drop.handle) to Online Store..."
  $pub = Invoke-StoreGraphql -Query $publishMutation -Variables @{
    id = $drop.id
    input = @(@{ publicationId = $onlineStorePublication })
  }
  if (@($pub.publishablePublish.userErrors).Count -gt 0) {
    throw ($pub.publishablePublish.userErrors | ConvertTo-Json)
  }
  Write-Host "Done: $($drop.handle)"
}

Write-Host 'Fall and Halloween drop collections are live.'
