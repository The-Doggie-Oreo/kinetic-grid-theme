# Publish D&D collection, products, and create landing page
param(
  [string]$Store = 'm3edqt-yw.myshopify.com'
)

$shopify = Join-Path $env:APPDATA 'npm\shopify.cmd'
$onlineStorePublication = 'gid://shopify/Publication/174884323488'
$collectionId = 'gid://shopify/Collection/689777279136'

$handles = @(
  'melted-dice-set',
  'champions-d20',
  'classic-coaster-dice-tray',
  'basilisk-dice-tower',
  'props-night-blade',
  'ravens-feast-dice-tower',
  'mad-wizard-dice-tower',
  'wolf-dice-tower'
)

function Invoke-StoreGraphql {
  param([string]$Query, [hashtable]$Variables)

  $varFile = Join-Path $env:TEMP 'kg-pub-vars.json'
  $queryFile = Join-Path $env:TEMP 'kg-pub-query.graphql'
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

function Publish-Resource {
  param([string]$Id, [string]$Label)

  $mutation = @'
mutation Publish($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    publishable { ... on Collection { handle } ... on Product { handle } }
    userErrors { field message }
  }
}
'@

  $vars = @{
    id = $Id
    input = @(@{ publicationId = $onlineStorePublication })
  }
  $res = Invoke-StoreGraphql -Query $mutation -Variables $vars
  if (@($res.publishablePublish.userErrors).Count -gt 0) {
    throw ($res.publishablePublish.userErrors | ConvertTo-Json)
  }
  Write-Host "Published $Label"
}

Write-Host 'Updating collection template...'
$updateCollection = @'
mutation UpdateCollection($input: CollectionInput!) {
  collectionUpdate(input: $input) {
    collection { id handle templateSuffix }
    userErrors { field message }
  }
}
'@
$res = Invoke-StoreGraphql -Query $updateCollection -Variables @{
  input = @{ id = $collectionId; templateSuffix = 'dnd' }
}
Write-Host "Collection template: $($res.collectionUpdate.collection.templateSuffix)"

Write-Host 'Publishing collection...'
Publish-Resource -Id $collectionId -Label 'collection dnd'

Write-Host 'Publishing products...'
foreach ($handle in $handles) {
  $q = 'query($query: String!) { products(first:1, query:$query) { nodes { id handle } } }'
  $product = Invoke-StoreGraphql -Query $q -Variables @{ query = "handle:$handle" }
  if ($product.products.nodes.Count -eq 0) {
    Write-Host "  skip missing: $handle"
    continue
  }
  $id = $product.products.nodes[0].id
  Publish-Resource -Id $id -Label $handle
}

Write-Host 'Creating D&D page (if missing)...'
$pageQuery = 'query { pages(first: 1, query: "handle:dnd") { nodes { id handle } } }'
try {
  $existing = Invoke-StoreGraphql -Query $pageQuery -Variables @{}
  if ($existing.pages.nodes.Count -gt 0) {
    Write-Host "Page already exists: $($existing.pages.nodes[0].handle)"
    Publish-Resource -Id $existing.pages.nodes[0].id -Label 'page dnd'
  } else {
    $createPage = @'
mutation CreatePage($page: PageCreateInput!) {
  pageCreate(page: $page) {
    page { id handle }
    userErrors { field message }
  }
}
'@
    $pageRes = Invoke-StoreGraphql -Query $createPage -Variables @{
      page = @{
        title = 'D&D & Tabletop'
        handle = 'dnd'
        body = '<p>Dice towers, miniatures, terrain, and tabletop accessories — made-to-order 3D prints for your next campaign.</p>'
        templateSuffix = 'dnd'
        isPublished = $true
      }
    }
    if (@($pageRes.pageCreate.userErrors).Count -gt 0) {
      throw ($pageRes.pageCreate.userErrors | ConvertTo-Json)
    }
    Publish-Resource -Id $pageRes.pageCreate.page.id -Label 'page dnd'
  }
} catch {
  Write-Warning "Page step skipped (may need write_content scope): $_"
}

Write-Host 'Done.'
