import type { CryptoAsset, Lock } from '../types'

// ----- Ethereum Contract Integration -----

// The deployed Ethereum TimeLock contract address (update after deployment)
// Find this in Remix IDE after deploying MoonvaultTimeLock
export const ETH_TIMELOCK_ADDRESS: string = '0x0deE2F4e9b2804c5DF22d37c9b234c30D90C2BBE'

// Returns true if contracts are deployed and ready for on-chain transactions
export function isContractDeployed(chain: 'ethereum' | 'solana'): boolean {
  if (chain === 'ethereum') return ETH_TIMELOCK_ADDRESS !== '0x0000000000000000000000000000000000000000'
  return SOLANA_PROGRAM_ID !== '11111111111111111111111111111111'
}

// ABI for the deployed MoonvaultTimeLock contract
export const ETH_TIMELOCK_ABI = [
  {
    inputs: [
      { name: '_unlockTime', type: 'uint256' },
      { name: '_description', type: 'string' },
    ],
    name: 'createNativeLock',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: '_lockId', type: 'uint256' }],
    name: 'unlockCrypto',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_user', type: 'address' }],
    name: 'getUserLocks',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_lockId', type: 'uint256' }],
    name: 'getLock',
    outputs: [
      {
        components: [
          { name: 'owner', type: 'address' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'unlockTime', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'description', type: 'string' },
          { name: 'isNativeToken', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_lockId', type: 'uint256' }],
    name: 'isReadyToUnlock',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_amount', type: 'uint256' }],
    name: 'calculateFee',
    outputs: [{ name: '', type: 'uint256' }],
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
  if (chain === 'ethereum') {
    // The deployed contract expects unlock time in MILLISECONDS (divides by 1000 internally)
    const unlockTimeMs = unlockDate.getTime()
    return createEthereumLock(crypto, amount, unlockTimeMs)
  } else {
    const unlockTimestamp = Math.floor(unlockDate.getTime() / 1000)
    return createSolanaLock(crypto, amount, unlockTimestamp)
  }
}

async function createEthereumLock(
  crypto: CryptoAsset,
  amount: number,
  unlockTimeMs: number,
): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask not found')

  // For native ETH locks
  if (crypto.symbol === 'ETH') {
    const amountWei = '0x' + BigInt(Math.floor(amount * 1e18)).toString(16)
    const description = `MoonVault Lock: ${amount} ${crypto.symbol}`

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          to: ETH_TIMELOCK_ADDRESS,
          value: amountWei,
          data: encodeCreateNativeLock(unlockTimeMs, description),
        },
      ],
    })
    return txHash as string
  }

  // For ERC-20 token locks (USDT, BNB, etc.)
  console.log(`Creating ERC-20 lock: ${amount} ${crypto.symbol} until ${unlockTimeMs}`)
  throw new Error(`ERC-20 token locking for ${crypto.symbol} requires token contract address configuration`)
}

async function createSolanaLock(
  crypto: CryptoAsset,
  amount: number,
  unlockTimestamp: number,
): Promise<string> {
  const solana = (window as { solana?: { isPhantom: boolean; signAndSendTransaction: (tx: unknown) => Promise<{ signature: string }> } }).solana
  if (!solana?.isPhantom) throw new Error('Phantom wallet not found')

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
          data: encodeUnlockCrypto(parseInt(lockId)),
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

function encodeCreateNativeLock(unlockTimeMs: number, description: string): string {
  // function selector for createNativeLock(uint256,string)
  const selector = '2f57487f'

  // Encode uint256 _unlockTime (in milliseconds)
  const encodedTime = BigInt(Math.floor(unlockTimeMs)).toString(16).padStart(64, '0')

  // Offset to string data: 2 static params * 32 bytes = 64 = 0x40
  const stringOffset = (64).toString(16).padStart(64, '0')

  // Encode string: length + padded UTF-8 bytes
  const encoder = new TextEncoder()
  const stringBytes = encoder.encode(description)
  const stringLength = stringBytes.length.toString(16).padStart(64, '0')

  const paddedByteLength = Math.ceil(stringBytes.length / 32) * 32
  let stringData = ''
  for (const byte of stringBytes) {
    stringData += byte.toString(16).padStart(2, '0')
  }
  stringData = stringData.padEnd(paddedByteLength * 2, '0')

  return '0x' + selector + encodedTime + stringOffset + stringLength + stringData
}

function encodeUnlockCrypto(lockId: number): string {
  // function selector for unlockCrypto(uint256)
  const selector = '635429c6'
  const encodedId = lockId.toString(16).padStart(64, '0')
  return '0x' + selector + encodedId
}
