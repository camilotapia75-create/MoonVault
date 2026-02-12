import { CRYPTO_ASSETS, type CryptoAsset } from '../types'

interface CryptoSelectorProps {
  selected: CryptoAsset | null
  onSelect: (asset: CryptoAsset) => void
  chain?: 'ethereum' | 'solana' | null
}

// Tokens supported per chain (native tokens only for now)
const SUPPORTED_TOKENS: Record<string, string[]> = {
  ethereum: ['ETH'],
  solana: ['SOL'],
}

export default function CryptoSelector({ selected, onSelect, chain }: CryptoSelectorProps) {
  const supported = chain ? SUPPORTED_TOKENS[chain] : null

  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-3">
        Select Cryptocurrency
      </label>
      <div className="grid grid-cols-3 gap-3">
        {CRYPTO_ASSETS.map((asset) => {
          const isSupported = !supported || supported.includes(asset.symbol)
          return (
            <button
              key={asset.id}
              onClick={() => onSelect(asset)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all bg-dark-600 ${
                !isSupported
                  ? 'border-white/5 opacity-40 cursor-not-allowed'
                  : selected?.id === asset.id
                    ? 'border-orange-500 cursor-pointer'
                    : 'border-white/10 hover:border-white/20 cursor-pointer'
              }`}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: `${asset.color}20`, color: asset.color }}
              >
                {asset.icon}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-white">{asset.symbol}</div>
                <div className="text-xs text-gray-400">{asset.name}</div>
              </div>
              {!isSupported && (
                <div className="text-[10px] text-gray-500">Coming soon</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
