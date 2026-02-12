import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useLocks } from '../hooks/useLocks'
import StatCard from '../components/StatCard'
import LockCard from '../components/LockCard'

export default function Dashboard() {
  const { wallet } = useWallet()
  const { locks, withdraw, stats } = useLocks()

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
          <span>&#x1f4b0;</span>
          <span className="tracking-widest uppercase">Secure your 100x</span>
        </div>
        <h1 className="text-6xl font-bold mb-4">
          <span className="text-orange-500">Moonvault</span>
        </h1>
        <p className="text-4xl font-bold text-white mb-6">Time-lock your wins</p>
        <p className="text-gray-400 max-w-xl mx-auto mb-8">
          Lock your cryptocurrency until a specific date with our secure smart contract solution.
          Your assets stay safe until you're ready to unlock them.
        </p>
        <div className="inline-block px-8 py-3 rounded-full border border-orange-500/30 text-orange-400 font-medium">
          Diamond hands is the ONLY option
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <StatCard
          value={String(stats.activeLocks)}
          label="Active locks"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
        />
        <StatCard
          value={`$${stats.totalValue.toLocaleString()}`}
          label="Total locked value"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          value={`${stats.securityScore}%`}
          label="Security score"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
      </div>

      {/* Locks */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your Locks</h2>
          <Link
            to="/create"
            className="flex items-center gap-2 px-5 py-2.5 orange-gradient-btn rounded-lg text-sm font-bold text-white no-underline transition-all"
          >
            + NEW LOCK
          </Link>
        </div>

        {!wallet.connected ? (
          <div className="card-gradient border border-white/5 rounded-xl p-12 text-center">
            <div className="text-gray-400 mb-2">Connect your wallet to view your locks</div>
            <div className="text-sm text-gray-500">
              Use the Connect Wallet button in the navigation bar
            </div>
          </div>
        ) : locks.length === 0 ? (
          <div className="card-gradient border border-white/5 rounded-xl p-12 text-center">
            <div className="text-gray-400 mb-2">No active locks</div>
            <div className="text-sm text-gray-500">
              Create your first time lock to secure your crypto
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {locks.map((lock) => (
              <LockCard key={lock.id} lock={lock} onWithdraw={withdraw} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
