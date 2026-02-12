export type CryptoId = 'BTC' | 'ETH' | 'USDT' | 'SOL' | 'BNB'

export interface CryptoAsset {
  id: CryptoId
  name: string
  symbol: string
  color: string
  icon: string
}

export interface Lock {
  id: string
  crypto: CryptoAsset
  amount: number
  unlockDate: Date
  createdAt: Date
  status: 'locked' | 'unlocked' | 'withdrawn'
  txHash?: string
  chain: 'ethereum' | 'solana'
}

export interface WalletState {
  address: string | null
  chain: 'ethereum' | 'solana' | null
  connected: boolean
}

export const CRYPTO_ASSETS: CryptoAsset[] = [
  { id: 'BTC', name: 'Bitcoin', symbol: 'BTC', color: '#f7931a', icon: 'B' },
  { id: 'ETH', name: 'Ethereum', symbol: 'ETH', color: '#627eea', icon: 'E' },
  { id: 'USDT', name: 'Tether', symbol: 'USDT', color: '#26a17b', icon: 'U' },
  { id: 'SOL', name: 'Solana', symbol: 'SOL', color: '#14f195', icon: 'S' },
  { id: 'BNB', name: 'Binance Coin', symbol: 'BNB', color: '#f0b90b', icon: 'B' },
]
