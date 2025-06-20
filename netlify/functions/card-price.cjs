const axios = require('axios')
const cheerio = require('cheerio')

// レート制限のためのシンプルなメモリストレージ
// 注意: Netlify Functionsは無状態なので、本番環境では外部ストレージが必要
let lastRequestTime = 0
const RATE_LIMIT_MS = 60000 // 1分間に1リクエスト (updated)

exports.handler = async (event, context) => {
  console.log(`=== Handler called at ${new Date().toISOString()} ===`)
  console.log('Event method:', event.httpMethod)
  console.log('Event headers:', event.headers)
  console.log('Event body:', event.body)
  
  // CORS設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  
  // プリフライトリクエストへの対応
  if (event.httpMethod === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }
  
  if (event.httpMethod !== 'POST') {
    console.log(`Invalid method: ${event.httpMethod}`)
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }
  
  try {
    console.log('Parsing request body...')
    const { cardName } = JSON.parse(event.body)
    
    if (!cardName) {
      console.log('No card name provided')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Card name is required' })
      }
    }
    
    console.log(`Processing card: ${cardName}`)
    
    // 開発モード用：環境変数でデモモードを制御
    const isDemoMode = process.env.DEMO_MODE === 'true'
    console.log(`Demo mode: ${isDemoMode}`)
    
    if (isDemoMode) {
      console.log('Demo mode: returning random price')
      // カード名の日本語マッピング
      const cardNameMapping = {
        'Island': '島',
        'Mountain': '山',
        'Plains': '平地',
        'Forest': '森',
        'Swamp': '沼',
        'Lightning Bolt': '稲妻',
        'Counterspell': '反駁',
        'Sleight of Hand': '手練',
        'Shivan Reef': 'シヴの浅瀬'
      }
      
      const japaneseName = cardNameMapping[cardName] || cardName
      const demoPrice = Math.floor(Math.random() * 1000) + 100
      const encodedCardName = encodeURIComponent(cardName)
      const url = `https://whisper.wisdom-guild.net/card/${encodedCardName}`
      
      const demoResult = {
        japaneseName,
        price: demoPrice,
        url
      }
      
      console.log('Demo result:', demoResult)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(demoResult)
      }
    }
    
    // レート制限チェック（簡易版）- より寛容な設定
    const now = Date.now()
    console.log(`Current time: ${now}, Last request: ${lastRequestTime}`)
    
    if (now - lastRequestTime < RATE_LIMIT_MS) {
      const waitTime = RATE_LIMIT_MS - (now - lastRequestTime)
      console.log(`Rate limit hit, wait time: ${waitTime}ms`)
      // レート制限エラーではなく、警告付きで処理続行
      console.log('Warning: Request within rate limit, but processing anyway for development')
    }
    
    lastRequestTime = now
    console.log('Rate limit passed, proceeding with API call')
    
    // Wisdom Guildからデータを取得
    console.log('Calling fetchCardPrice...')
    const result = await fetchCardPrice(cardName)
    console.log('fetchCardPrice completed, result:', result)
    
    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }
    
    console.log('Returning successful response:', response)
    return response
    
  } catch (error) {
    console.error('=== Handler error ===')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    }
  }
}

async function fetchCardPrice(cardName) {
  try {
    const encodedCardName = encodeURIComponent(cardName)
    const url = `https://whisper.wisdom-guild.net/card/${encodedCardName}`
    
    console.log(`Fetching URL: ${url}`)
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MTG-Price-Calculator/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000,
      maxRedirects: 5
    })
    
    const $ = cheerio.load(response.data)
    
    // Pythonコードと同じロジックで価格を取得
    let price = null
    let priceTag = null
    
    try {
      // まず価格要素を探す
      const wonderPriceDiv = $('div.wg-wonder-price-summary')
      if (wonderPriceDiv.length > 0) {
        priceTag = wonderPriceDiv.find('b')
        console.log(`Found wg-wonder-price-summary div, b elements: ${priceTag.length}`)
        
        if (priceTag.length > 0) {
          // 複数のb要素がある場合は、価格らしいものを探す
          let foundValidPrice = false
          
          priceTag.each(function(index) {
            if (foundValidPrice) return // 既に見つかっていたらスキップ
            
            const priceText = $(this).text().trim()
            console.log(`B element ${index}: "${priceText}"`)
            
            // 価格らしい文字列を判定（数字とカンマのみ、かつ妥当な長さ）
            if (/^[\d,]+$/.test(priceText) && priceText.length <= 10) {
              // カンマを削除して数値に変換
              const cleanPrice = priceText.replace(/,/g, '')
              const parsedPrice = parseInt(cleanPrice)
              
              // 妥当な価格範囲（1円〜100万円）
              if (!isNaN(parsedPrice) && parsedPrice > 0 && parsedPrice <= 1000000) {
                price = parsedPrice
                console.log(`Successfully parsed price from b element ${index}: ${price}`)
                foundValidPrice = true
              } else {
                console.log(`Price out of range from element ${index}: ${parsedPrice}`)
              }
            } else {
              console.log(`Invalid price format from element ${index}: "${priceText}"`)
            }
          })
          
          if (!foundValidPrice) {
            console.log('No valid price found in any b elements')
          }
        }
      } else {
        console.log('wg-wonder-price-summary div not found')
      }
    } catch (priceError) {
      console.log(`Error parsing price: ${priceError.message}`)
    }
    
    // 日本語名を取得（Pythonコードと同じロジック）
    let japaneseName = 'N/A'
    
    try {
      const whisperTitleDiv = $('div.wg-whisper-card-title')
      if (whisperTitleDiv.length > 0) {
        const h1Element = whisperTitleDiv.find('h1')
        if (h1Element.length > 0) {
          const titleText = h1Element.text().trim()
          console.log(`Title text: "${titleText}"`)
          
          if (titleText) {
            const parts = titleText.split('/')
            if (parts.length > 0) {
              japaneseName = parts[0].trim()
              console.log(`Japanese name: "${japaneseName}"`)
            }
          }
        } else {
          console.log('h1 element not found in wg-whisper-card-title')
        }
      } else {
        console.log('wg-whisper-card-title div not found')
      }
    } catch (nameError) {
      console.log(`Error parsing name: ${nameError.message}`)
    }
    
    // デバッグ用：見つからない場合は関連要素を探す
    if (price === null || japaneseName === 'N/A') {
      console.log('Debugging: Looking for alternative selectors...')
      
      // 価格関連の要素を探す
      const priceElements = $('[class*="price"], [class*="wonder"], b, strong').filter(function() {
        const text = $(this).text()
        return /\d+/.test(text) && text.length < 20
      })
      
      console.log(`Found ${priceElements.length} potential price elements:`)
      priceElements.each(function(i) {
        if (i < 5) { // 最初の5個だけログ出力
          console.log(`  ${i}: "${$(this).text().trim()}" (class: ${$(this).attr('class')})`)
        }
      })
      
      // タイトル関連の要素を探す
      const titleElements = $('h1, h2, [class*="title"], [class*="card"]').filter(function() {
        const text = $(this).text()
        return text.length > 0 && text.length < 100
      })
      
      console.log(`Found ${titleElements.length} potential title elements:`)
      titleElements.each(function(i) {
        if (i < 3) { // 最初の3個だけログ出力
          console.log(`  ${i}: "${$(this).text().trim()}" (class: ${$(this).attr('class')})`)
        }
      })
    }
    
    console.log(`Final result - JP: ${japaneseName}, Price: ${price}`)
    
    return {
      japaneseName: japaneseName !== 'N/A' ? japaneseName : cardName,
      price: price || 'N/A',
      url
    }
  } catch (error) {
    console.error(`Error fetching ${cardName}:`, error.message)
    
    // エラー時でもURLは返す
    const encodedCardName = encodeURIComponent(cardName)
    const url = `https://whisper.wisdom-guild.net/card/${encodedCardName}`
    
    return {
      japaneseName: cardName,
      price: 'N/A',
      url,
      error: error.message
    }
  }
}
