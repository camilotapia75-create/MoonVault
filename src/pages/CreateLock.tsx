import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useLocks } from '../hooks/useLocks'
import CryptoSelector from '../components/CryptoSelector'
import type { CryptoAsset } from '../types'

export default function CreateLock() {
  const { wallet } = useWallet()
  const { createLock } = useLocks()
  const navigate = useNavigate()

  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset | null>(null)
  const [amount, setAmount] = useState('')
  const [unlockDate, setUnlockDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Minimum unlock date: at least 1 day + 1 hour buffer from now (matches contract's minimumLockTime)
  const minUnlockDate = new Date(Date.now() + 25 * 60 * 60 * 1000)
  const minDateString = minUnlockDate.toISOString().slice(0, 16)

  const unlockDateTooSoon = unlockDate ? new Date(unlockDate).getTime() < minUnlockDate.getTime() : false

  // Only ETH is supported on Ethereum chain for now (no ERC-20 support yet)
  const isUnsupportedToken = selectedCrypto && wallet.chain === 'ethereum' && selectedCrypto.symbol !== 'ETH'

  const handleSubmit = async () => {
    if (!selectedCrypto || !amount || !unlockDate || !wallet.connected) return
    if (unlockDateTooSoon || isUnsupportedToken) return

    setIsSubmitting(true)
    try {
      await createLock({
        crypto: selectedCrypto,
        amount: parseFloat(amount),
        unlockDate: new Date(unlockDate),
      })
      navigate('/')
    } catch (err) {
      console.error('Failed to create lock:', err)
      alert(err instanceof Error ? err.message : 'Failed to create lock. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValid = selectedCrypto && parseFloat(amount) > 0 && unlockDate && wallet.connected && !unlockDateTooSoon && !isUnsupportedToken

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link
        to="/"
        className="text-gray-400 hover:text-white text-sm no-underline transition-colors mb-4 inline-block"
      >
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-4xl font-bold text-white mb-2">Create Time Lock</h1>
      <p className="text-gray-400 mb-10">
        Lock your cryptocurrency until a specific date. Your funds will be securely stored in a smart contract.
      </p>

      <div className="card-gradient border border-white/5 rounded-2xl p-8 space-y-8">
        {/* Crypto Selector */}
        <CryptoSelector selected={selectedCrypto} onSelect={setSelectedCrypto} chain={wallet.chain} />
        {isUnsupportedToken && (
          <p className="text-xs text-red-400 -mt-4">
            Only ETH is currently supported for locking on Ethereum. ERC-20 token support coming soon.
          </p>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">
            Amount to Lock
          </label>
          <div className="flex items-center bg-dark-600 border border-white/10 rounded-xl overflow-hidden">
            <input
              type="number"
              step="0.0001"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-white text-lg p-4 border-0 outline-none"
            />
            {selectedCrypto && (
              <div className="flex items-center gap-2 px-4 text-gray-400">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${selectedCrypto.color}20`, color: selectedCrypto.color }}
                >
                  {selectedCrypto.icon}
                </div>
                <span className="text-sm font-medium">{selectedCrypto.symbol}</span>
              </div>
            )}
          </div>
        </div>

        {/* Unlock Date */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Unlock Date
          </label>
          <input
            type="datetime-local"
            value={unlockDate}
            onChange={(e) => setUnlockDate(e.target.value)}
            min={minDateString}
            className={`w-full bg-dark-600 border rounded-xl text-white p-4 outline-none [color-scheme:dark] ${
              unlockDateTooSoon ? 'border-red-500/50' : 'border-white/10'
            }`}
          />
          {unlockDateTooSoon ? (
            <p className="text-xs text-red-400 mt-2">
              Minimum lock period is 1 day. Please choose a later date.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              Your funds will be locked until this date and time (minimum 1 day)
            </p>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-dark-600 border border-white/10 rounded-xl p-4 flex gap-3">
          <div className="text-orange-400 mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white mb-1">Security Notice</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your crypto will be locked in a secure smart contract. Once locked, the funds cannot be
              accessed until the unlock date. Make sure you've selected the correct date before proceeding.
            </p>
          </div>
        </div>

        {/* Submit */}
        {!wallet.connected ? (
          <div className="text-center text-gray-400 text-sm py-4">
            Please connect your wallet to create a lock
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={`w-full py-4 rounded-xl text-base font-bold text-white border-0 cursor-pointer transition-all ${
              isValid && !isSubmitting
                ? 'orange-gradient-btn'
                : 'bg-dark-500 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Creating Lock...' : 'CREATE LOCK →'}
          </button>
        )}
      </div>
    </div>
  )
}
