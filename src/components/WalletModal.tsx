import { useWallet } from '../context/WalletContext'

interface WalletModalProps {
  onClose: () => void
}

export default function WalletModal({ onClose }: WalletModalProps) {
  const { connectEthereum, connectSolana } = useWallet()

  const handleConnect = async (chain: 'ethereum' | 'solana') => {
    if (chain === 'ethereum') {
      await connectEthereum()
    } else {
      await connectSolana()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card-gradient border border-white/10 rounded-2xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Connect Wallet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-transparent border-0 text-xl cursor-pointer">
            &times;
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          Choose your preferred blockchain to connect your wallet.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleConnect('ethereum')}
            className="flex items-center gap-4 w-full p-4 bg-dark-600 border border-white/10 rounded-xl hover:border-orange-500/50 transition-all cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#627eea]/20 flex items-center justify-center text-[#627eea] font-bold">
              E
            </div>
            <div>
              <div className="text-white font-medium">Ethereum</div>
              <div className="text-gray-400 text-xs">MetaMask, WalletConnect</div>
            </div>
          </button>

          <button
            onClick={() => handleConnect('solana')}
            className="flex items-center gap-4 w-full p-4 bg-dark-600 border border-white/10 rounded-xl hover:border-orange-500/50 transition-all cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#14f195]/20 flex items-center justify-center text-[#14f195] font-bold">
              S
            </div>
            <div>
              <div className="text-white font-medium">Solana</div>
              <div className="text-gray-400 text-xs">Phantom, Solflare</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
