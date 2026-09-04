# Requires: shopify store auth --store m3edqt-yw.myshopify.com --scopes write_products,read_products,write_publications,read_publications
param(
  [string]$Store = 'm3edqt-yw.myshopify.com',
  [string]$OnlyHandle = ''
)

$shopify = Join-Path $env:APPDATA 'npm\shopify.cmd'

$products = @(
  @{
    slug = 'melted-dice-set'
    title = 'Melted Dice Set'
    price = '89.00'
    tagline = 'A tower made of dice and plants: a chaotic mix of luck and greenery.'
    size = 'Approx. 40 cm tall'
    images = @(
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Melted_Dice_Setthumb_46af3c5814.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Melted_Dice_Set_WB_1_cb48cabb40.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Melted_Dice_Set9_9c2904929f.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Melted_Dice_Set1_82969a7c34.jpg'
    )
  },
  @{
    slug = 'champions-d20'
    title = "Champion's D20"
    price = '29.00'
    tagline = 'A legendary dice planter. Roll high and let your plants flourish like a victorious adventurer.'
    size = 'Approx. 13 cm tall'
    images = @(
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Champion_s_D20_thumb_f567e9f61b.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Champion_s_D20_WB_1_5a5d9304a5.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Champion_s_D20_1_34b856f82d.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Champion_s_D20_2_7b5ca00ac6.jpg'
    )
  },
  @{
    slug = 'classic-coaster-dice-tray'
    title = 'Class-ic Coaster and Dice Tray'
    price = '34.00'
    tagline = 'Classic class coasters plus a dice tray for your character sheet and that new dice set you needed.'
    size = 'Tabletop set'
    images = @(
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Class_ic_Coaster_and_Dice_Tray_thumb_b235f810fa.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Class_ic_Coaster_and_Dice_Tray_1_Photoroom_3_8bc8033b89.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Class_ic_Coaster_and_Dice_Tray_3_Photoroom_6fe7f4fc90.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Class_ic_Coaster_and_Dice_Tray_1_0a27bb3bba.jpg'
    )
  },
  @{
    slug = 'basilisk-dice-tower'
    title = 'Basilisk Dice Tower'
    price = '44.00'
    tagline = 'If your dice tower bites you, it is venomous. If you bite your dice tower, you are not very bright.'
    size = 'Approx. 21 cm tall'
    images = @(
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Basilisk_Dice_Towerthumb_6f0cc31a62.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/AI_1_a2db0f8955.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/AI_2_c9e4a3044f.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Basilisk_Dice_Tower1_7d481a95af.jpg'
    )
  },
  @{
    slug = 'props-night-blade'
    title = 'Props - Night Blade'
    price = '38.00'
    tagline = 'Terrain prop for underground adventures where rocky surfaces hide creatures in darkness.'
    size = 'Scene prop'
    images = @(
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/PROPS_thumb_3d38bfc0ae.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/PROPS_Prancheta_1_3850946ee4.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/PROPS_1_35a0d6040a.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/PROPS_2_71c6a65a89.jpg'
    )
  },
  @{
    slug = 'ravens-feast-dice-tower'
    title = "Raven's Feast Dice Tower"
    price = '52.00'
    tagline = 'This raven is a fan of snacking on colorful tiny polyhedral dice.'
    size = 'Approx. 22 cm tall'
    images = @(
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Raven_s_Feast_Dice_Tower_thumb_4e552fcb6f.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/2_a0082a447f.png',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Raven_s_Feast_Dice_Tower_1_5ac11ce97c.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/1_3814d7012d.jpg'
    )
  },
  @{
    slug = 'mad-wizard-dice-tower'
    title = 'Mad Wizard Dice Tower'
    price = '58.00'
    tagline = 'Any wizard can have a tower. Only a mad wizard would have a tower this impressive.'
    size = 'Approx. 21 cm tall'
    images = @(
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Mad_Wizard_Dice_Tower_thumb_8caad49845.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/3_93260c2f77.png',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Mad_Wizard_Dice_Tower_1_d4ac372f5f.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/1_5fe0385551.jpg'
    )
  },
  @{
    slug = 'wolf-dice-tower'
    title = 'Wolf Dice Tower'
    price = '56.00'
    tagline = "It doesn't really bite you, but better not take any chances."
    size = 'Approx. 22 cm tall'
    images = @(
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Wolf_Bite_Dice_Tower_thumb_6805e9aa85.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/3_af8f5dc3df.png',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/Wolf_Bite_Dice_Tower_1_1c94305fb2.jpg',
      'https://s3.us-east-2.amazonaws.com/static.stlflix.com/1_7c844fd975.jpg'
    )
  }
)

function Invoke-StoreGraphql {
  param(
    [string]$Query,
    [hashtable]$Variables
  )

  $varFile = Join-Path $env:TEMP 'kg-gql-vars.json'
  $queryFile = Join-Path $env:TEMP 'kg-gql-query.graphql'
  $json = if ($Variables.Count -eq 0) { '{}' } else { $Variables | ConvertTo-Json -Depth 10 -Compress }
  [System.IO.File]::WriteAllText($queryFile, $Query)
  [System.IO.File]::WriteAllText($varFile, $json)
  $out = & $shopify store execute --store $Store --allow-mutations --query-file $queryFile --variable-file $varFile --json 2>&1
  $text = ($out | Out-String).Trim()
  if ($text -match '(?s)(\{[\s\S]*\})\s*$') {
    $text = $Matches[1]
  }
  if ($LASTEXITCODE -ne 0 -and $text -notmatch '^\{') {
    throw $text
  }
  $parsed = $text | ConvertFrom-Json
  if ($parsed.PSObject.Properties.Name -contains 'data') {
    return $parsed.data
  }
  if ($parsed.PSObject.Properties.Name -contains 'errors') {
    throw ($parsed.errors | ConvertTo-Json -Depth 5)
  }
  return $parsed
}

function Get-ProductByHandle {
  param([string]$Handle)

  $query = @'
query GetProduct($query: String!) {
  products(first: 1, query: $query) {
    nodes {
      id
      handle
      title
      variants(first: 1) { nodes { id price } }
    }
  }
}
'@

  $res = Invoke-StoreGraphql -Query $query -Variables @{ query = "handle:$Handle" }
  if ($res.products.nodes.Count -gt 0) {
    return $res.products.nodes[0]
  }
  return $null
}

function Ensure-Collection {
  $query = @'
query {
  collections(first: 1, query: "handle:dnd") {
    nodes { id handle }
  }
}
'@

  $existing = Invoke-StoreGraphql -Query $query -Variables @{}
  if ($existing.collections.nodes.Count -gt 0) {
    return $existing.collections.nodes[0].id
  }

  $mutation = @'
mutation CreateDnd($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection { id handle }
    userErrors { field message }
  }
}
'@

  $vars = @{
    input = @{
      title = 'D and D Tabletop'
      handle = 'dnd'
      descriptionHtml = '<p>Dice towers, miniatures, terrain, and tabletop accessories. Made-to-order 3D prints for D&amp;D and RPG sessions.</p>'
      templateSuffix = 'dnd'
    }
  }
  $res = Invoke-StoreGraphql -Query $mutation -Variables $vars
  if (@($res.collectionCreate.userErrors).Count -gt 0) {
    throw ($res.collectionCreate.userErrors | ConvertTo-Json)
  }
  return $res.collectionCreate.collection.id
}

function Set-VariantPrice {
  param(
    [string]$ProductId,
    [string]$VariantId,
    [string]$Price
  )

  $mutation = @'
mutation UpdateVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id price }
    userErrors { field message }
  }
}
'@

  $vars = @{
    productId = $ProductId
    variants = @(
      @{
        id = $VariantId
        price = $Price
        inventoryPolicy = 'CONTINUE'
      }
    )
  }
  $res = Invoke-StoreGraphql -Query $mutation -Variables $vars
  if (@($res.productVariantsBulkUpdate.userErrors).Count -gt 0) {
    throw ($res.productVariantsBulkUpdate.userErrors | ConvertTo-Json)
  }
}

function New-Product {
  param($item)

  $existing = Get-ProductByHandle -Handle $item.slug
  if ($existing) {
    Write-Host "  -> already exists: $($existing.handle)"
    if ($existing.variants.nodes[0].price -ne $item.price) {
      Set-VariantPrice -ProductId $existing.id -VariantId $existing.variants.nodes[0].id -Price $item.price
      Write-Host "  -> updated price to $($item.price)"
    }
    return $existing
  }

  $body = "<p>$($item.tagline)</p><p><strong>Made to order</strong> - 3D printed when you purchase. $($item.size).</p>"
  $media = @($item.images | ForEach-Object {
    @{
      originalSource = $_
      alt = $item.title
      mediaContentType = 'IMAGE'
    }
  })

  $mutation = @'
mutation CreateProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
  productCreate(product: $product, media: $media) {
    product {
      id
      handle
      title
      variants(first: 1) { nodes { id price } }
    }
    userErrors { field message }
  }
}
'@

  $vars = @{
    product = @{
      title = $item.title
      handle = $item.slug
      descriptionHtml = $body
      vendor = 'Kinetic Grid 3D'
      productType = '3D Print'
      tags = @('DnD', 'Tabletop', 'Made to Order')
      status = 'ACTIVE'
    }
    media = $media
  }
  $res = Invoke-StoreGraphql -Query $mutation -Variables $vars
  if (@($res.productCreate.userErrors).Count -gt 0) {
    throw ($res.productCreate.userErrors | ConvertTo-Json)
  }
  $product = $res.productCreate.product
  $variant = $product.variants.nodes[0]
  if ($variant.price -ne $item.price) {
    Set-VariantPrice -ProductId $product.id -VariantId $variant.id -Price $item.price
  }
  return $product
}

function Add-ToCollection {
  param(
    [string]$CollectionId,
    [string]$ProductId
  )

  $mutation = @'
mutation AddProducts($id: ID!, $productIds: [ID!]!) {
  collectionAddProducts(id: $id, productIds: $productIds) {
    collection { id }
    userErrors { field message }
  }
}
'@

  $vars = @{ id = $CollectionId; productIds = @($ProductId) }
  $res = Invoke-StoreGraphql -Query $mutation -Variables $vars
  if (@($res.collectionAddProducts.userErrors).Count -gt 0) {
    throw ($res.collectionAddProducts.userErrors | ConvertTo-Json)
  }
}

$collectionId = Ensure-Collection
Write-Host "Collection: $collectionId"

foreach ($item in $products) {
  if ($OnlyHandle -and $item.slug -ne $OnlyHandle) { continue }
  Write-Host "Creating $($item.title)..."
  $product = New-Product $item
  Add-ToCollection -CollectionId $collectionId -ProductId $product.id
  Write-Host "  -> $($product.handle) ($($item.price))"
}

Write-Host 'Done.'
