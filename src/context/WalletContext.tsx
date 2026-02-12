import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { WalletState } from '../types'

interface WalletContextType {
  wallet: WalletState
  connectEthereum: () => Promise<void>
  connectSolana: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chain: null,
    connected: false,
  })

  const connectEthereum = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to connect an Ethereum wallet.')
      return
    }
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]
      if (accounts.length > 0) {
        setWallet({ address: accounts[0], chain: 'ethereum', connected: true })
      }
    } catch (err) {
      console.error('Failed to connect Ethereum wallet:', err)
    }
  }, [])

  const connectSolana = useCallback(async () => {
    const solana = (window as WindowWithSolana).solana
    if (!solana?.isPhantom) {
      alert('Please install Phantom to connect a Solana wallet.')
      return
    }
    try {
      const resp = await solana.connect()
      setWallet({
        address: resp.publicKey.toString(),
        chain: 'solana',
        connected: true,
      })
    } catch (err) {
      console.error('Failed to connect Solana wallet:', err)
    }
  }, [])

  const disconnect = useCallback(() => {
    setWallet({ address: null, chain: null, connected: false })
  }, [])

  return (
    <WalletContext.Provider value={{ wallet, connectEthereum, connectSolana, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

interface WindowWithSolana extends Window {
  solana?: {
    isPhantom: boolean
    connect: () => Promise<{ publicKey: { toString: () => string } }>
  }
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, cb: (...args: unknown[]) => void) => void
    }
  }
}
