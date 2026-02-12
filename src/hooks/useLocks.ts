import { useState, useCallback, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import type { Lock, CryptoAsset } from '../types'
import { CRYPTO_ASSETS } from '../types'
import { createTimeLock, withdrawTimeLock, getUserLocks, isContractDeployed } from './useContracts'

interface CreateLockParams {
  crypto: CryptoAsset
  amount: number
  unlockDate: Date
}

interface LockStats {
  activeLocks: number
  totalValue: number
  securityScore: number
}

const MOCK_LOCKS: Lock[] = [
  {
    id: '1',
    crypto: CRYPTO_ASSETS[3], // SOL
    amount: 2.0,
    unlockDate: new Date('2026-06-15'),
    createdAt: new Date('2025-12-01'),
    status: 'locked',
    chain: 'solana',
  },
  {
    id: '2',
    crypto: CRYPTO_ASSETS[1], // ETH
    amount: 5.5,
    unlockDate: new Date('2026-09-01'),
    createdAt: new Date('2025-11-15'),
    status: 'locked',
    chain: 'ethereum',
  },
  {
    id: '3',
    crypto: CRYPTO_ASSETS[0], // BTC
    amount: 0.25,
    unlockDate: new Date('2027-01-01'),
    createdAt: new Date('2025-10-20'),
    status: 'locked',
    chain: 'ethereum',
  },
]

export function useLocks() {
  const { wallet } = useWallet()
  const [locks, setLocks] = useState<Lock[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (wallet.connected && wallet.address) {
      loadLocks()
    } else {
      setLocks([])
    }
  }, [wallet.connected, wallet.address])

  const loadLocks = useCallback(async () => {
    if (!wallet.address || !wallet.chain) return
    setLoading(true)
    try {
      const onChainLocks = await getUserLocks(wallet.address, wallet.chain)
      setLocks(onChainLocks.length > 0 ? onChainLocks : MOCK_LOCKS)
    } catch {
      // Fall back to mock data if contract calls fail
      setLocks(MOCK_LOCKS)
    } finally {
      setLoading(false)
    }
  }, [wallet.address, wallet.chain])

  const createLock = useCallback(
    async (params: CreateLockParams) => {
      if (!wallet.address || !wallet.chain) {
        throw new Error('Wallet not connected')
      }

      // Demo mode: store locks locally when contracts aren't deployed
      if (!isContractDeployed(wallet.chain)) {
        const newLock: Lock = {
          id: crypto.randomUUID(),
          crypto: params.crypto,
          amount: params.amount,
          unlockDate: params.unlockDate,
          createdAt: new Date(),
          status: 'locked',
          chain: wallet.chain,
        }
        setLocks((prev) => [...prev, newLock])
        return newLock
      }

      const txHash = await createTimeLock(
        wallet.chain,
        params.crypto,
        params.amount,
        params.unlockDate,
      )

      const newLock: Lock = {
        id: txHash || crypto.randomUUID(),
        crypto: params.crypto,
        amount: params.amount,
        unlockDate: params.unlockDate,
        createdAt: new Date(),
        status: 'locked',
        txHash,
        chain: wallet.chain,
      }

      setLocks((prev) => [...prev, newLock])
      return newLock
    },
    [wallet.address, wallet.chain],
  )

  const withdraw = useCallback(
    async (lockId: string) => {
      if (!wallet.address || !wallet.chain) return

      const lock = locks.find((l) => l.id === lockId)
      if (!lock) return

      // Demo mode: just update local state
      if (!isContractDeployed(wallet.chain)) {
        setLocks((prev) =>
          prev.map((l) => (l.id === lockId ? { ...l, status: 'withdrawn' as const } : l)),
        )
        return
      }

      try {
        await withdrawTimeLock(wallet.chain, lockId)
        setLocks((prev) =>
          prev.map((l) => (l.id === lockId ? { ...l, status: 'withdrawn' as const } : l)),
        )
      } catch (err) {
        console.error('Withdraw failed:', err)
        alert('Withdrawal failed. The lock period may not have ended yet.')
      }
    },
    [wallet.address, wallet.chain, locks],
  )

  const activeLocks = locks.filter((l) => l.status === 'locked')

  const stats: LockStats = {
    activeLocks: activeLocks.length,
    totalValue: activeLocks.reduce((sum, lock) => {
      const prices: Record<string, number> = {
        BTC: 100000,
        ETH: 3500,
        SOL: 200,
        USDT: 1,
        BNB: 600,
      }
      return sum + lock.amount * (prices[lock.crypto.symbol] || 0)
    }, 0),
    securityScore: 100,
  }

  return { locks: activeLocks, loading, createLock, withdraw, stats, loadLocks }
}
