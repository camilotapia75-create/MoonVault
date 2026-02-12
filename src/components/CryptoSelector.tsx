import { CRYPTO_ASSETS, type CryptoAsset } from '../types'

interface CryptoSelectorProps {
  selected: CryptoAsset | null
  onSelect: (asset: CryptoAsset) => void
}

export default function CryptoSelector({ selected, onSelect }: CryptoSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-3">
        Select Cryptocurrency
      </label>
      <div className="grid grid-cols-3 gap-3">
        {CRYPTO_ASSETS.map((asset) => (
          <button
            key={asset.id}
            onClick={() => onSelect(asset)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer bg-dark-600 ${
              selected?.id === asset.id
                ? 'border-orange-500'
                : 'border-white/10 hover:border-white/20'
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
          </button>
        ))}
      </div>
    </div>
  )
}
