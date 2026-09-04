# Set lifestyle/scene image as 2nd product media (hover); remove YouTube videos
param(
  [string]$Store = 'm3edqt-yw.myshopify.com',
  [string]$OnlyHandle = ''
)

$shopify = Join-Path $env:APPDATA 'npm\shopify.cmd'

# [0] = catalog thumb (featured), [1] = lifestyle hover image, [2+] = extra gallery
$productMedia = @{
  'melted-dice-set' = @(
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Melted_Dice_Setthumb_46af3c5814.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Melted_Dice_Set_WB_1_cb48cabb40.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Melted_Dice_Set9_9c2904929f.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Melted_Dice_Set1_82969a7c34.jpg'
  )
  'champions-d20' = @(
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Champion_s_D20_thumb_f567e9f61b.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Champion_s_D20_WB_1_5a5d9304a5.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Champion_s_D20_1_34b856f82d.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Champion_s_D20_2_7b5ca00ac6.jpg'
  )
  'classic-coaster-dice-tray' = @(
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Class_ic_Coaster_and_Dice_Tray_thumb_b235f810fa.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Class_ic_Coaster_and_Dice_Tray_1_Photoroom_3_8bc8033b89.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Class_ic_Coaster_and_Dice_Tray_3_Photoroom_6fe7f4fc90.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Class_ic_Coaster_and_Dice_Tray_1_0a27bb3bba.jpg'
  )
  'basilisk-dice-tower' = @(
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Basilisk_Dice_Towerthumb_6f0cc31a62.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/AI_1_a2db0f8955.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/AI_2_c9e4a3044f.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Basilisk_Dice_Tower1_7d481a95af.jpg'
  )
  'props-night-blade' = @(
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/PROPS_thumb_3d38bfc0ae.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/PROPS_Prancheta_1_3850946ee4.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/PROPS_1_35a0d6040a.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/PROPS_2_71c6a65a89.jpg'
  )
  'ravens-feast-dice-tower' = @(
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Raven_s_Feast_Dice_Tower_thumb_4e552fcb6f.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/2_a0082a447f.png',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Raven_s_Feast_Dice_Tower_1_5ac11ce97c.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/1_3814d7012d.jpg'
  )
  'mad-wizard-dice-tower' = @(
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Mad_Wizard_Dice_Tower_thumb_8caad49845.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/3_93260c2f77.png',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Mad_Wizard_Dice_Tower_1_d4ac372f5f.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/1_5fe0385551.jpg'
  )
  'wolf-dice-tower' = @(
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Wolf_Bite_Dice_Tower_thumb_6805e9aa85.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/3_af8f5dc3df.png',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Wolf_Bite_Dice_Tower_1_1c94305fb2.jpg',
    'https://s3.us-east-2.amazonaws.com/static.stlflix.com/1_7c844fd975.jpg'
  )
}

function Invoke-StoreGraphql {
  param([string]$Query, [hashtable]$Variables)

  $varFile = Join-Path $env:TEMP 'kg-hover-vars.json'
  $queryFile = Join-Path $env:TEMP 'kg-hover-query.graphql'
  $json = if ($Variables.Count -eq 0) { '{}' } else { $Variables | ConvertTo-Json -Depth 12 -Compress }
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

function Get-Filename {
  param([string]$Url)
  ([uri]$Url).Segments[-1]
}

foreach ($entry in $productMedia.GetEnumerator()) {
  if ($OnlyHandle -and $entry.Key -ne $OnlyHandle) { continue }
  $handle = $entry.Key
  $desiredUrls = $entry.Value
  Write-Host "Updating $handle..."

  $lookup = Invoke-StoreGraphql -Query @'
query ProductMedia($query: String!) {
  products(first: 1, query: $query) {
    nodes {
      id
      handle
      media(first: 20) {
        nodes {
          id
          mediaContentType
          ... on MediaImage { image { url } }
        }
      }
    }
  }
}
'@ -Variables @{ query = "handle:$handle" }

  $product = $lookup.products.nodes[0]
  if (-not $product) {
    Write-Host "  skip: not found"
    continue
  }

  $toDelete = @()
  foreach ($m in $product.media.nodes) {
    if ($m.mediaContentType -eq 'EXTERNAL_VIDEO') {
      $toDelete += $m.id
    }
  }

  if ($toDelete.Count -gt 0) {
    $del = Invoke-StoreGraphql -Query @'
mutation DeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
  productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
    deletedMediaIds
    mediaUserErrors { field message }
  }
}
'@ -Variables @{ productId = $product.id; mediaIds = $toDelete }
    Write-Host "  removed $($toDelete.Count) video(s)"
  }

  $lookup = Invoke-StoreGraphql -Query @'
query ProductMedia($query: String!) {
  products(first: 1, query: $query) {
    nodes {
      id
      media(first: 20) {
        nodes {
          id
          mediaContentType
          ... on MediaImage { image { url } }
        }
      }
    }
  }
}
'@ -Variables @{ query = "handle:$handle" }

  $product = $lookup.products.nodes[0]
  $existingByFile = @{}
  foreach ($m in $product.media.nodes) {
    if ($m.mediaContentType -eq 'IMAGE' -and $m.image.url) {
      $file = Get-Filename $m.image.url
      $existingByFile[$file] = $m.id
    }
  }

  $orderedIds = @()
  foreach ($url in $desiredUrls) {
    $file = Get-Filename $url
    if ($existingByFile.ContainsKey($file)) {
      $orderedIds += $existingByFile[$file]
    } else {
      $add = Invoke-StoreGraphql -Query @'
mutation AddMedia($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { id ... on MediaImage { image { url } } }
    mediaUserErrors { field message }
  }
}
'@ -Variables @{
        productId = $product.id
        media = @(@{ originalSource = $url; alt = $handle; mediaContentType = 'IMAGE' })
      }
      if (@($add.productCreateMedia.mediaUserErrors).Count -gt 0) {
        throw ($add.productCreateMedia.mediaUserErrors | ConvertTo-Json)
      }
      $newId = $add.productCreateMedia.media[0].id
      $orderedIds += $newId
      $existingByFile[$file] = $newId
      Write-Host "  added $file"
    }
  }

  foreach ($m in $product.media.nodes) {
    if ($m.mediaContentType -eq 'IMAGE' -and $orderedIds -notcontains $m.id) {
      $orderedIds += $m.id
    }
  }

  $moves = @()
  for ($i = 0; $i -lt $orderedIds.Count; $i++) {
    $moves += @{ id = $orderedIds[$i]; newPosition = [string]$i }
  }

  $reorder = Invoke-StoreGraphql -Query @'
mutation ReorderMedia($id: ID!, $moves: [MoveInput!]!) {
  productReorderMedia(id: $id, moves: $moves) {
    job { id done }
    userErrors { field message }
  }
}
'@ -Variables @{ id = $product.id; moves = $moves }

  if (@($reorder.productReorderMedia.userErrors).Count -gt 0) {
    throw ($reorder.productReorderMedia.userErrors | ConvertTo-Json)
  }

  Write-Host "  -> hover image: $(Get-Filename $desiredUrls[1])"
}

Write-Host 'Done.'
