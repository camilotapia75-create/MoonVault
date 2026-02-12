import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import WalletModal from './WalletModal'
import { useState } from 'react'

export default function Navbar() {
  const { wallet, disconnect } = useWallet()
  const location = useLocation()
  const [showWalletModal, setShowWalletModal] = useState(false)

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`.toUpperCase()

  const navLinks = [
    { to: '/', label: 'DASHBOARD' },
    { to: '/create', label: 'CREATE LOCK' },
  ]

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2 text-white no-underline">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-lg font-semibold">Moonvault</span>
        </Link>

        <div className="flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium no-underline transition-colors ${
                location.pathname === link.to
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {wallet.connected && wallet.address ? (
          <button
            onClick={disconnect}
            className="px-5 py-2.5 bg-dark-600 border border-white/10 rounded-full text-sm font-medium text-white hover:bg-dark-500 transition-colors cursor-pointer"
          >
            {truncateAddress(wallet.address)}
          </button>
        ) : (
          <button
            onClick={() => setShowWalletModal(true)}
            className="px-5 py-2.5 orange-gradient-btn rounded-full text-sm font-bold text-white border-0 cursor-pointer transition-all"
          >
            Connect Wallet
          </button>
        )}
      </nav>

      {showWalletModal && (
        <WalletModal onClose={() => setShowWalletModal(false)} />
      )}
    </>
  )
}
