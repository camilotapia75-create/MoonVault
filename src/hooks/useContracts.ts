import type { CryptoAsset, Lock } from '../types'

// ----- Ethereum Contract Integration -----

// The deployed Ethereum TimeLock contract address (update after deployment)
export const ETH_TIMELOCK_ADDRESS = '0x0000000000000000000000000000000000000000'

// Returns true if contracts are deployed and ready for on-chain transactions
export function isContractDeployed(chain: 'ethereum' | 'solana'): boolean {
  if (chain === 'ethereum') return ETH_TIMELOCK_ADDRESS !== '0x0000000000000000000000000000000000000000'
  return SOLANA_PROGRAM_ID !== '11111111111111111111111111111111'
}

// ABI for the MoonVaultTimeLock Ethereum contract
export const ETH_TIMELOCK_ABI = [
  {
    inputs: [{ name: 'unlockTime', type: 'uint256' }],
    name: 'createLock',
    outputs: [{ name: 'lockId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'unlockTime', type: 'uint256' },
    ],
    name: 'createTokenLock',
    outputs: [{ name: 'lockId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'lockId', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserLocks',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'unlockTime', type: 'uint256' },
          { name: 'withdrawn', type: 'bool' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// ----- Solana Program Integration -----

// The deployed Solana TimeLock program ID (update after deployment)
export const SOLANA_PROGRAM_ID = '11111111111111111111111111111111'

// ----- Contract Interaction Functions -----

export async function createTimeLock(
  chain: 'ethereum' | 'solana',
  crypto: CryptoAsset,
  amount: number,
  unlockDate: Date,
): Promise<string> {
  const unlockTimestamp = Math.floor(unlockDate.getTime() / 1000)

  if (chain === 'ethereum') {
    return createEthereumLock(crypto, amount, unlockTimestamp)
  } else {
    return createSolanaLock(crypto, amount, unlockTimestamp)
  }
}

async function createEthereumLock(
  crypto: CryptoAsset,
  amount: number,
  unlockTimestamp: number,
): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask not found')

  // For native ETH locks
  if (crypto.symbol === 'ETH') {
    const amountWei = '0x' + BigInt(Math.floor(amount * 1e18)).toString(16)

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          to: ETH_TIMELOCK_ADDRESS,
          value: amountWei,
          data: encodeCreateLock(unlockTimestamp),
        },
      ],
    })
    return txHash as string
  }

  // For ERC-20 token locks (USDT, BNB, etc.)
  // In production, you'd approve the token first, then call createTokenLock
  console.log(`Creating ERC-20 lock: ${amount} ${crypto.symbol} until ${unlockTimestamp}`)
  throw new Error(`ERC-20 token locking for ${crypto.symbol} requires token contract address configuration`)
}

async function createSolanaLock(
  crypto: CryptoAsset,
  amount: number,
  unlockTimestamp: number,
): Promise<string> {
  const solana = (window as { solana?: { isPhantom: boolean; signAndSendTransaction: (tx: unknown) => Promise<{ signature: string }> } }).solana
  if (!solana?.isPhantom) throw new Error('Phantom wallet not found')

  // In production, build and send a Solana transaction to the MoonVault program
  console.log(`Creating Solana lock: ${amount} ${crypto.symbol} until ${unlockTimestamp}`)
  throw new Error('Solana program interaction requires @solana/web3.js - deploy the program first')
}

export async function withdrawTimeLock(
  chain: 'ethereum' | 'solana',
  lockId: string,
): Promise<string> {
  if (chain === 'ethereum') {
    if (!window.ethereum) throw new Error('MetaMask not found')

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          to: ETH_TIMELOCK_ADDRESS,
          data: encodeWithdraw(parseInt(lockId)),
        },
      ],
    })
    return txHash as string
  } else {
    throw new Error('Solana withdraw requires program deployment')
  }
}

export async function getUserLocks(
  _address: string,
  _chain: 'ethereum' | 'solana',
): Promise<Lock[]> {
  // In production, query the smart contract for user's locks
  // For now, return empty so the app falls back to mock data
  return []
}

// ----- ABI Encoding Helpers -----

function encodeCreateLock(unlockTimestamp: number): string {
  // function selector for createLock(uint256)
  const selector = '0xb8a24252'
  const encodedTime = unlockTimestamp.toString(16).padStart(64, '0')
  return selector + encodedTime
}

function encodeWithdraw(lockId: number): string {
  // function selector for withdraw(uint256)
  const selector = '0x2e1a7d4d'
  const encodedId = lockId.toString(16).padStart(64, '0')
  return selector + encodedId
}
