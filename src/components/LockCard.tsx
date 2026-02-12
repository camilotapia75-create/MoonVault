import type { Lock } from '../types'

interface LockCardProps {
  lock: Lock
  onWithdraw?: (lockId: string) => void
}

export default function LockCard({ lock, onWithdraw }: LockCardProps) {
  const now = new Date()
  const isUnlockable = now >= lock.unlockDate && lock.status === 'locked'
  const timeRemaining = getTimeRemaining(lock.unlockDate)

  return (
    <div className="card-gradient border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: `${lock.crypto.color}20`, color: lock.crypto.color }}
          >
            {lock.crypto.icon}
          </div>
          <div>
            <div className="font-semibold text-white">{lock.crypto.name}</div>
            <div className="text-xs text-gray-400">{lock.crypto.symbol}</div>
          </div>
        </div>
        <div className="text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Amount</span>
          <span className="text-white font-medium">
            {lock.amount.toFixed(4)} {lock.crypto.symbol}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Unlock Date</span>
          <span className="text-white font-medium">
            {lock.unlockDate.toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Status</span>
          <span className={`font-medium ${isUnlockable ? 'text-green-400' : 'text-orange-400'}`}>
            {isUnlockable ? 'Ready to unlock' : timeRemaining}
          </span>
        </div>
      </div>

      {isUnlockable && onWithdraw && (
        <button
          onClick={() => onWithdraw(lock.id)}
          className="w-full mt-4 py-2.5 orange-gradient-btn rounded-lg text-sm font-bold text-white border-0 cursor-pointer transition-all"
        >
          Withdraw
        </button>
      )}
    </div>
  )
}

function getTimeRemaining(unlockDate: Date): string {
  const now = new Date()
  const diff = unlockDate.getTime() - now.getTime()
  if (diff <= 0) return 'Unlocked'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  if (days > 0) return `${days}d ${hours}h remaining`
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  return `${hours}h ${minutes}m remaining`
}
