<script setup>
import { ref, computed } from 'vue'

const deckInput = ref('')
const results = ref([])
const isProcessing = ref(false)
const processedCards = ref(0)
const totalCards = ref(0)
const currentCard = ref('')
const nextRequestCountdown = ref(0)

const progressPercentage = computed(() => {
  if (totalCards.value === 0) return 0
  return Math.round((processedCards.value / totalCards.value) * 100)
})

const totalPrice = computed(() => {
  return results.value.reduce((sum, card) => {
    return sum + (typeof card.totalPrice === 'number' ? card.totalPrice : 0)
  }, 0)
})

// デッキリストをパースする関数
function parseDeckList(text) {
  const lines = text.trim().split('\n')
  const deck = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    const parts = trimmed.split(' ')
    if (parts.length >= 2) {
      const quantity = parseInt(parts[0])
      const cardName = parts.slice(1).join(' ')
      
      if (!isNaN(quantity) && cardName) {
        deck.push({ quantity, name: cardName })
      }
    }
  }
  
  return deck
}

// カード名の英語→日本語マッピング辞書
const cardNameMapping = {
  // 基本土地
  'Island': '島',
  'Mountain': '山',
  'Plains': '平地',
  'Forest': '森',
  'Swamp': '沼',
  
  // よく使われるカード
  'Lightning Bolt': '稲妻',
  'Counterspell': '反駁',
  'Sleight of Hand': '手練',
  'Shivan Reef': 'シヴの浅瀬',
  'Black Lotus': 'ブラック・ロータス',
  'Time Walk': 'タイム・ウォーク',
  'Ancestral Recall': '先祖の記憶',
  'Mystical Tutor': 'ミスティカル・チューター',
  'Force of Will': '意志の力',
  'Brainstorm': 'ブレインストーム',
  'Swords to Plowshares': '剣を鍬に',
  'Path to Exile': '流刑への道',
  'Giant Growth': '巨大化',
  'Dark Ritual': '暗黒の儀式',
  'Sol Ring': 'ゾル・リング',
  'Mana Crypt': 'マナの墓所',
  'Scalding Tarn': '沸騰する小湖',
  'Polluted Delta': '汚染された三角州',
  'Flooded Strand': '溢れかえる岸辺',
  'Windswept Heath': '吹きさらしの荒野',
  'Bloodstained Mire': '血染めのぬかるみ',
  'Wooded Foothills': '樹木茂る山麓',
  'Arid Mesa': '乾燥台地',
  'Marsh Flats': '湿地の干潟',
  'Verdant Catacombs': '新緑の地下墓地',
  'Misty Rainforest': '霧深い雨林'
}

// カード価格を取得する関数
async function getCardPrice(cardName) {
  console.log(`=== getCardPrice called for: ${cardName} ===`)
  
  try {
    // Netlify Functions用のエンドポイント
    const API_ENDPOINT = '/.netlify/functions/card-price'
    console.log(`Making request to: ${API_ENDPOINT}`)
    
    const requestBody = { cardName }
    console.log('Request body:', requestBody)
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log(`Response status: ${response.status}`)
    console.log(`Response ok: ${response.ok}`)
    
    if (!response.ok) {
      if (response.status === 429) {
        const data = await response.json()
        console.log('Rate limit response:', data)
        throw new Error(`レート制限: ${data.waitTime}秒後に再試行してください`)
      }
      const errorText = await response.text()
      console.error(`HTTP error response: ${errorText}`)
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('API response data:', data)
    
    // カード名マッピングをフォールバックとして使用
    const mappedName = cardNameMapping[cardName]
    const japaneseName = data.japaneseName && data.japaneseName !== cardName 
      ? data.japaneseName 
      : (mappedName || cardName)
    
    const result = {
      japaneseName,
      price: data.price,
      url: data.url
    }
    
    console.log(`Final result for ${cardName}:`, result)
    return result
    
  } catch (error) {
    console.error(`=== Error in getCardPrice for ${cardName} ===`)
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // エラー時はマッピング辞書を使用してデモデータを表示
    const mappedName = cardNameMapping[cardName] || cardName
    const demoPrice = Math.floor(Math.random() * 1000) + 100 // デモ用価格
    
    const fallbackResult = {
      japaneseName: mappedName,
      price: process.env.NODE_ENV === 'development' ? demoPrice : 'N/A',
      url: `https://whisper.wisdom-guild.net/card/${encodeURIComponent(cardName)}`
    }
    
    console.log(`Fallback result for ${cardName}:`, fallbackResult)
    return fallbackResult
  }
}

// レート制限付きで価格計算を実行
async function calculatePrices() {
  if (!deckInput.value.trim()) return
  
  const deck = parseDeckList(deckInput.value)
  console.log('Parsed deck:', deck)
  
  if (deck.length === 0) {
    alert('有効なデッキリストが見つかりませんでした。')
    return
  }
  
  isProcessing.value = true
  results.value = []
  processedCards.value = 0
  totalCards.value = deck.length
  
  console.log(`Starting price calculation for ${deck.length} cards`)
  
  // 1分間でリクエストを分散（最低3秒間隔）
  const requestInterval = Math.max(60000 / deck.length, 3000)
  console.log(`Request interval: ${requestInterval}ms`)
  
  for (let i = 0; i < deck.length; i++) {
    const card = deck[i]
    currentCard.value = card.name
    
    console.log(`Processing card ${i + 1}/${deck.length}: ${card.name} (quantity: ${card.quantity})`)
    
    try {
      // カウントダウン表示
      if (i > 0) {
        const countdownSeconds = Math.ceil(requestInterval / 1000)
        console.log(`Waiting ${countdownSeconds} seconds before next request`)
        
        for (let countdown = countdownSeconds; countdown > 0; countdown--) {
          nextRequestCountdown.value = countdown
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log(`Fetching price for: ${card.name}`)
      const priceInfo = await getCardPrice(card.name)
      console.log(`Price info received:`, priceInfo)
      
      const cardResult = {
        id: i,
        quantity: card.quantity,
        originalName: card.name,
        japaneseName: priceInfo.japaneseName,
        price: priceInfo.price,
        totalPrice: typeof priceInfo.price === 'number' ? priceInfo.price * card.quantity : 'N/A',
        url: priceInfo.url
      }
      
      console.log(`Card result created:`, cardResult)
      results.value.push(cardResult)
      processedCards.value++
      console.log(`Progress: ${processedCards.value}/${totalCards.value}`)
      
    } catch (error) {
      console.error(`Failed to process card ${card.name}:`, error)
      
      // エラー時もカードを結果に追加（価格は'N/A'）
      const cardResult = {
        id: i,
        quantity: card.quantity,
        originalName: card.name,
        japaneseName: cardNameMapping[card.name] || card.name,
        price: 'N/A',
        totalPrice: 'N/A',
        url: `https://whisper.wisdom-guild.net/card/${encodeURIComponent(card.name)}`
      }
      
      console.log(`Error result created:`, cardResult)
      results.value.push(cardResult)
      processedCards.value++
      
      // レート制限エラーの場合は待機時間を延長
      if (error.message.includes('レート制限')) {
        console.log('Rate limit error detected, waiting additional 30 seconds')
        await new Promise(resolve => setTimeout(resolve, 30000)) // 30秒追加待機
      }
    }
  }
  
  console.log('Price calculation completed')
  console.log('Final results:', results.value)
  
  isProcessing.value = false
  currentCard.value = ''
  nextRequestCountdown.value = 0
}

// CSVエクスポート機能
function exportToCsv() {
  if (results.value.length === 0) return
  
  const headers = ['枚数', 'カード名', '単価', '小計', 'URL']
  const csvContent = [
    headers.join(','),
    ...results.value.map(card => [
      card.quantity,
      `"${card.japaneseName}"`,
      card.price === 'N/A' ? 'N/A' : card.price,
      card.totalPrice === 'N/A' ? 'N/A' : card.totalPrice,
      `"${card.url}"`
    ].join(',')),
    '',
    `,,,"合計",${totalPrice.value}`
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', 'mtg_deck_prices.csv')
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 入力をクリア
function clearInput() {
  deckInput.value = ''
  results.value = []
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-4 py-6">
        <h1 class="text-3xl font-bold text-gray-900 text-center">🎴 MTG Deck Pricer</h1>
        <p class="text-gray-600 text-center mt-2">Magic: The Gatheringデッキの価格を計算します</p>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <!-- Input Section -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">デッキリスト入力</h2>
        <textarea
          v-model="deckInput"
          placeholder="デッキリストをここに貼り付けてください&#10;例:&#10;4 Lightning Bolt&#10;2 Counterspell&#10;1 Black Lotus"
          rows="10"
          class="w-full min-h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        ></textarea>
        <div class="flex gap-3 mt-4">
          <button 
            @click="calculatePrices" 
            :disabled="isProcessing || !deckInput.trim()"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {{ isProcessing ? '計算中...' : '価格計算開始' }}
          </button>
          <button 
            @click="clearInput"
            :disabled="isProcessing"
            class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            クリア
          </button>
        </div>
      </div>

      <!-- Progress Section -->
      <div v-if="isProcessing" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="text-center">
          <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              class="bg-blue-600 h-3 rounded-full transition-all duration-300" 
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>
          <p class="text-gray-900 font-medium">{{ currentCard }} を検索中... ({{ processedCards }}/{{ totalCards }})</p>
          <p class="text-gray-500 text-sm mt-2">次のリクエストまで: {{ nextRequestCountdown }}秒</p>
        </div>
      </div>

      <!-- Results Section -->
      <div v-if="results.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-900">計算結果</h2>
          <button 
            @click="exportToCsv" 
            class="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            CSVエクスポート
          </button>
        </div>
        
        <!-- Summary -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 text-center">
            合計金額: ¥{{ totalPrice.toLocaleString() }}
          </h3>
        </div>

        <!-- Results Table -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-left py-3 px-4 font-semibold text-gray-900">枚数</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-900">カード名</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-900">単価</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-900">小計</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-900">詳細</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="card in results" :key="card.id" class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4 text-gray-900">{{ card.quantity }}</td>
                <td class="py-3 px-4 text-gray-900">{{ card.japaneseName }}</td>
                <td class="py-3 px-4 text-gray-900">
                  {{ card.price === 'N/A' ? 'N/A' : '¥' + card.price.toLocaleString() }}
                </td>
                <td class="py-3 px-4 text-gray-900">
                  {{ card.totalPrice === 'N/A' ? 'N/A' : '¥' + card.totalPrice.toLocaleString() }}
                </td>
                <td class="py-3 px-4">
                  <a :href="card.url" target="_blank" class="text-blue-600 hover:text-blue-800 underline">
                    リンク
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* TailwindCSSを使用するため、カスタムスタイルは最小限に */
</style>
