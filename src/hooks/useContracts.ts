import type { CryptoAsset, Lock } from '../types'
import { CRYPTO_ASSETS } from '../types'

// ----- Ethereum Contract Integration -----

// The deployed Ethereum TimeLock contract address (update after deployment)
export const ETH_TIMELOCK_ADDRESS: string = '0x0deE2F4e9b2804c5DF22d37c9b234c30D90C2BBE'

// Sepolia testnet chain ID
const SEPOLIA_CHAIN_ID = '0xaa36a7'

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

// ----- Network Helpers -----

async function ensureSepoliaNetwork(): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask not found')
  const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
  if (chainId.toLowerCase() === SEPOLIA_CHAIN_ID) return

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    })
  } catch (err: unknown) {
    const switchErr = err as { code?: number }
    if (switchErr.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: SEPOLIA_CHAIN_ID,
          chainName: 'Sepolia Testnet',
          nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://rpc.sepolia.org'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      })
    } else {
      throw new Error('Please switch to Sepolia testnet in MetaMask')
    }
  }
}

async function getConnectedAddress(): Promise<string> {
  const accounts = await window.ethereum!.request({ method: 'eth_accounts' }) as string[]
  if (!accounts.length) throw new Error('No connected account')
  return accounts[0]
}

// ----- Contract Interaction Functions -----

export interface CreateLockResult {
  txHash: string
  lockId: number
}

export async function createTimeLock(
  chain: 'ethereum' | 'solana',
  crypto: CryptoAsset,
  amount: number,
  unlockDate: Date,
): Promise<CreateLockResult> {
  if (chain === 'ethereum') {
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
): Promise<CreateLockResult> {
  if (!window.ethereum) throw new Error('MetaMask not found')

  await ensureSepoliaNetwork()

  if (crypto.symbol !== 'ETH') {
    throw new Error(`Only ETH is supported for locking. ERC-20 token support coming soon.`)
  }

  const from = await getConnectedAddress()
  const amountWei = '0x' + BigInt(Math.floor(amount * 1e18)).toString(16)
  const description = `MoonVault Lock: ${amount} ${crypto.symbol}`

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: ETH_TIMELOCK_ADDRESS,
      value: amountWei,
      data: encodeCreateNativeLock(unlockTimeMs, description),
    }],
  }) as string

  // Wait for receipt and extract lockId from LockCreated event
  const lockId = await getLockIdFromReceipt(txHash)
  return { txHash, lockId }
}

async function createSolanaLock(
  _crypto: CryptoAsset,
  _amount: number,
  _unlockTimestamp: number,
): Promise<CreateLockResult> {
  throw new Error('Solana program not deployed yet')
}

export async function withdrawTimeLock(
  chain: 'ethereum' | 'solana',
  lockId: string,
): Promise<string> {
  if (chain === 'ethereum') {
    if (!window.ethereum) throw new Error('MetaMask not found')

    await ensureSepoliaNetwork()
    const from = await getConnectedAddress()

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from,
        to: ETH_TIMELOCK_ADDRESS,
        data: encodeUnlockCrypto(parseInt(lockId)),
      }],
    })
    return txHash as string
  } else {
    throw new Error('Solana withdraw requires program deployment')
  }
}

// ----- On-Chain Lock Fetching -----

export async function fetchUserLocks(
  address: string,
  chain: 'ethereum' | 'solana',
): Promise<Lock[]> {
  if (chain !== 'ethereum' || !isContractDeployed('ethereum')) return []
  if (!window.ethereum) return []

  try {
    // Call getUserLocks(address) to get lock IDs
    const lockIdsData = await window.ethereum.request({
      method: 'eth_call',
      params: [{
        to: ETH_TIMELOCK_ADDRESS,
        data: encodeGetUserLocks(address),
      }, 'latest'],
    }) as string

    const lockIds = decodeUint256Array(lockIdsData)
    if (lockIds.length === 0) return []

    // Fetch each lock's details
    const locks: Lock[] = []
    for (const id of lockIds) {
      const lockData = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: ETH_TIMELOCK_ADDRESS,
          data: encodeGetLock(id),
        }, 'latest'],
      }) as string

      const lock = decodeLockData(id, lockData)
      if (lock) locks.push(lock)
    }

    return locks
  } catch (err) {
    console.error('Failed to fetch on-chain locks:', err)
    return []
  }
}

// ----- Receipt Parsing -----

interface TxReceipt {
  logs: Array<{
    address: string
    topics: string[]
    data: string
  }>
}

async function getLockIdFromReceipt(txHash: string): Promise<number> {
  // Poll for transaction receipt
  for (let i = 0; i < 60; i++) {
    const receipt = await window.ethereum!.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }) as TxReceipt | null

    if (receipt) {
      // LockCreated event topic0
      const eventTopic = '0x22b6b8a4d5a914ae1011461bc63aae897aa95e59716646efa0f307cca8a1ae63'

      for (const log of receipt.logs) {
        if (
          log.address.toLowerCase() === ETH_TIMELOCK_ADDRESS.toLowerCase() &&
          log.topics[0] === eventTopic
        ) {
          // topics[1] is the indexed lockId
          return parseInt(log.topics[1], 16)
        }
      }
      // If no event found, fall back to parsing lockCounter
      console.warn('LockCreated event not found in receipt, using lockId 0')
      return 0
    }

    await new Promise(r => setTimeout(r, 2000))
  }

  throw new Error('Transaction not confirmed after 2 minutes. Check Etherscan for status.')
}

// ----- ABI Encoding Helpers -----

function encodeCreateNativeLock(unlockTimeMs: number, description: string): string {
  // function selector for createNativeLock(uint256,string)
  const selector = '2f57487f'

  const encodedTime = BigInt(Math.floor(unlockTimeMs)).toString(16).padStart(64, '0')

  // Offset to string data: 2 slots * 32 bytes = 64 = 0x40
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

function encodeGetUserLocks(address: string): string {
  // function selector for getUserLocks(address)
  const selector = '23a35de9'
  const paddedAddress = address.slice(2).toLowerCase().padStart(64, '0')
  return '0x' + selector + paddedAddress
}

function encodeGetLock(lockId: number): string {
  // function selector for getLock(uint256)
  const selector = 'd68f4dd1'
  const encodedId = lockId.toString(16).padStart(64, '0')
  return '0x' + selector + encodedId
}

// ----- ABI Decoding Helpers -----

function decodeUint256Array(data: string): number[] {
  // Strip 0x prefix
  const hex = data.slice(2)
  if (hex.length < 128) return [] // at minimum: offset(32) + length(32)

  // First 32 bytes = offset to array data
  const offset = parseInt(hex.slice(0, 64), 16) * 2 // convert byte offset to hex char offset
  // At offset: 32 bytes = array length
  const length = parseInt(hex.slice(offset, offset + 64), 16)

  const ids: number[] = []
  for (let i = 0; i < length; i++) {
    const start = offset + 64 + i * 64
    ids.push(parseInt(hex.slice(start, start + 64), 16))
  }
  return ids
}

function decodeLockData(lockId: number, data: string): Lock | null {
  const hex = data.slice(2)
  if (hex.length < 64) return null

  // First 32 bytes = offset to tuple data
  const tupleOffset = parseInt(hex.slice(0, 64), 16) * 2

  // Tuple fields (each 32 bytes / 64 hex chars):
  // [0] owner (address)
  // [1] tokenAddress (address)
  // [2] amount (uint256)
  // [3] unlockTime (uint256)
  // [4] status (uint8)
  // [5] offset to description string (relative to tuple start)
  // [6] isNativeToken (bool)
  // [7] createdAt (uint256)
  const field = (i: number) => hex.slice(tupleOffset + i * 64, tupleOffset + (i + 1) * 64)

  const status = parseInt(field(4), 16) // 0=Active, 1=Unlocked
  const amountWei = BigInt('0x' + field(2))
  const unlockTimeSec = parseInt(field(3), 16)
  const createdAtSec = parseInt(field(7), 16)
  const isNativeToken = parseInt(field(6), 16) === 1

  // Map contract status to frontend status
  let lockStatus: 'locked' | 'unlocked' | 'withdrawn'
  if (status === 0) {
    lockStatus = 'locked'
  } else {
    lockStatus = 'withdrawn'
  }

  // Convert wei to ETH (18 decimals)
  const amountEth = Number(amountWei) / 1e18

  // Determine crypto asset
  const crypto = isNativeToken
    ? CRYPTO_ASSETS.find(a => a.symbol === 'ETH')!
    : CRYPTO_ASSETS.find(a => a.symbol === 'ETH')! // Only ETH supported for now

  return {
    id: String(lockId),
    crypto,
    amount: amountEth,
    unlockDate: new Date(unlockTimeSec * 1000),
    createdAt: new Date(createdAtSec * 1000),
    status: lockStatus,
    chain: 'ethereum',
  }
}
