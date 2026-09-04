# Attach STLFlix technical overview videos to D&D products (YouTube external video)
param(
  [string]$Store = 'm3edqt-yw.myshopify.com'
)

$shopify = Join-Path $env:APPDATA 'npm\shopify.cmd'

$videoByHandle = @{
  'classic-coaster-dice-tray' = 'https://www.youtube.com/watch?v=BmHpYJHDo_s'
  'basilisk-dice-tower' = 'https://www.youtube.com/watch?v=dCvMWQmd6yY'
  'ravens-feast-dice-tower' = 'https://www.youtube.com/watch?v=dCvMWQmd6yY'
  'mad-wizard-dice-tower' = 'https://www.youtube.com/watch?v=dCvMWQmd6yY'
}

function Invoke-StoreGraphql {
  param([string]$Query, [hashtable]$Variables)

  $varFile = Join-Path $env:TEMP 'kg-video-vars.json'
  $queryFile = Join-Path $env:TEMP 'kg-video-query.graphql'
  $json = if ($Variables.Count -eq 0) { '{}' } else { $Variables | ConvertTo-Json -Depth 10 -Compress }
  [System.IO.File]::WriteAllText($queryFile, $Query)
  [System.IO.File]::WriteAllText($varFile, $json)
  $out = & $shopify store execute --store $Store --allow-mutations --query-file $queryFile --variable-file $varFile --json 2>&1
  $text = ($out | Out-String).Trim()
  if ($text -match '(?s)(\{[\s\S]*\})\s*$') { $text = $Matches[1] }
  if ($LASTEXITCODE -ne 0 -and $text -notmatch '^\{') { throw $text }
  $parsed = $text | ConvertFrom-Json
  if ($parsed.PSObject.Properties.Name -contains 'data') { return $parsed.data }
  if ($parsed.PSObject.Properties.Name -contains 'errors') { throw ($parsed.errors | ConvertTo-Json -Depth 5) }
  return $parsed
}

foreach ($entry in $videoByHandle.GetEnumerator()) {
  $handle = $entry.Key
  $videoUrl = $entry.Value

  Write-Host "Adding video to $handle..."

  $lookup = Invoke-StoreGraphql -Query @'
query ProductMedia($query: String!) {
  products(first: 1, query: $query) {
    nodes {
      id
      handle
      media(first: 10) { nodes { mediaContentType } }
    }
  }
}
'@ -Variables @{ query = "handle:$handle" }

  $product = $lookup.products.nodes[0]
  if (-not $product) {
    Write-Host "  skip: product not found"
    continue
  }

  $hasExternal = $false
  foreach ($m in $product.media.nodes) {
    if ($m.mediaContentType -eq 'EXTERNAL_VIDEO') { $hasExternal = $true; break }
  }
  if ($hasExternal) {
    Write-Host "  skip: already has external video"
    continue
  }

  $mutation = @'
mutation AddVideo($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { mediaContentType }
    mediaUserErrors { field message }
  }
}
'@

  $res = Invoke-StoreGraphql -Query $mutation -Variables @{
    productId = $product.id
    media = @(
      @{
        originalSource = $videoUrl
        alt = 'Product preview'
        mediaContentType = 'EXTERNAL_VIDEO'
      }
    )
  }

  if (@($res.productCreateMedia.mediaUserErrors).Count -gt 0) {
    throw ($res.productCreateMedia.mediaUserErrors | ConvertTo-Json)
  }

  Write-Host "  -> added"
}

Write-Host 'Done.'
