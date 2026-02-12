# CLAUDE.md - MoonVault

## Project Overview

MoonVault is a cryptocurrency time-lock DeFi application. Users lock their crypto assets (ETH, SOL, BTC, USDT, BNB) in smart contracts until a specified unlock date. Once locked, funds cannot be withdrawn until the lock period expires — enforcing "diamond hands" behavior.

The project has three main parts:
1. **Frontend** — React SPA with wallet connection and lock management UI
2. **Ethereum Smart Contract** — Solidity contract for locking ETH and ERC-20 tokens
3. **Solana Program** — Anchor/Rust program for locking SOL and SPL tokens

## Repository Structure

```
MoonVault/
├── CLAUDE.md                          # This file
├── index.html                         # HTML entry point
├── package.json                       # Node dependencies and scripts
├── vite.config.ts                     # Vite build config with Tailwind
├── tsconfig.json                      # TypeScript project references
├── tsconfig.app.json                  # App TypeScript config
├── tsconfig.node.json                 # Node TypeScript config
├── eslint.config.js                   # ESLint configuration
│
├── src/                               # Frontend source code
│   ├── main.tsx                       # Entry point, renders App with BrowserRouter
│   ├── App.tsx                        # Root component with routes and WalletProvider
│   ├── index.css                      # Tailwind CSS v4 imports and custom theme
│   ├── vite-env.d.ts                  # Vite type declarations
│   │
│   ├── types/
│   │   └── index.ts                   # Shared TypeScript types (Lock, CryptoAsset, WalletState)
│   │
│   ├── context/
│   │   └── WalletContext.tsx           # Wallet connection state (Ethereum/Solana)
│   │
│   ├── hooks/
│   │   ├── useLocks.ts                # Lock CRUD operations + stats calculation
│   │   └── useContracts.ts            # Smart contract interaction (ABI, tx encoding)
│   │
│   ├── components/
│   │   ├── Navbar.tsx                  # Top navigation with wallet connect button
│   │   ├── WalletModal.tsx             # Chain selection modal (Ethereum/Solana)
│   │   ├── StatCard.tsx                # Dashboard statistics card
│   │   ├── LockCard.tsx                # Individual lock display with withdraw
│   │   └── CryptoSelector.tsx          # Grid selector for choosing a cryptocurrency
│   │
│   └── pages/
│       ├── Dashboard.tsx               # Main page: hero, stats, lock list
│       └── CreateLock.tsx              # Create lock form: crypto, amount, date
│
├── contracts/
│   ├── ethereum/
│   │   ├── MoonVaultTimeLock.sol       # Solidity time-lock contract
│   │   └── IERC20.sol                  # Minimal ERC-20 interface
│   │
│   └── solana/
│       ├── Anchor.toml                 # Anchor framework configuration
│       └── programs/
│           └── moonvault-timelock/
│               ├── Cargo.toml          # Rust crate config
│               └── src/
│                   └── lib.rs          # Anchor program: SOL + SPL token locking
│
└── public/
    └── vite.svg                        # Favicon
```

## Tech Stack

| Layer            | Technology                        |
|------------------|-----------------------------------|
| Frontend         | React 19, TypeScript, Vite 7      |
| Styling          | Tailwind CSS v4                   |
| Routing          | React Router DOM v7               |
| ETH Contract     | Solidity ^0.8.24                  |
| SOL Program      | Anchor 0.30, Rust                 |
| ETH Wallet       | MetaMask (window.ethereum)        |
| SOL Wallet       | Phantom (window.solana)           |

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Type-check and build for production
npm run build

# Preview production build locally
npm run preview

# Lint the codebase
npm run lint
```

## Smart Contract Deployment

### Ethereum (Solidity)

The contract is at `contracts/ethereum/MoonVaultTimeLock.sol`. To deploy:

1. Use Hardhat or Foundry to compile and deploy
2. Update `ETH_TIMELOCK_ADDRESS` in `src/hooks/useContracts.ts` with the deployed address
3. The contract supports:
   - `createLock(uint256 unlockTime)` — Lock native ETH (payable)
   - `createTokenLock(address token, uint256 amount, uint256 unlockTime)` — Lock ERC-20 tokens
   - `withdraw(uint256 lockId)` — Withdraw after unlock time
   - `getUserLocks(address user)` — View all locks for a user

### Solana (Anchor)

The program is at `contracts/solana/programs/moonvault-timelock/`. To deploy:

1. Install Anchor CLI: `cargo install --git https://github.com/coral-xyz/anchor anchor-cli`
2. Build: `cd contracts/solana && anchor build`
3. Deploy: `anchor deploy`
4. Update `SOLANA_PROGRAM_ID` in `src/hooks/useContracts.ts` with the deployed program ID
5. The program supports:
   - `create_sol_lock` — Lock native SOL
   - `create_token_lock` — Lock SPL tokens
   - `withdraw_sol` — Withdraw SOL after unlock time
   - `withdraw_token` — Withdraw SPL tokens after unlock time

## Architecture & Key Patterns

### Wallet Connection Flow
1. User clicks "Connect Wallet" in Navbar
2. `WalletModal` opens — user chooses Ethereum or Solana
3. `WalletContext` calls `window.ethereum.request()` or `window.solana.connect()`
4. Connected address is stored in React context and displayed in Navbar

### Lock Creation Flow
1. User navigates to `/create`
2. Selects a cryptocurrency, enters amount, picks unlock date
3. On submit, `useLocks.createLock()` calls `useContracts.createTimeLock()`
4. The contract function constructs and sends a blockchain transaction
5. Lock is added to local state and appears on Dashboard

### Lock Withdrawal Flow
1. Dashboard shows active locks via `LockCard` components
2. If a lock's unlock date has passed, a "Withdraw" button appears
3. Clicking it calls `useLocks.withdraw()` → `useContracts.withdrawTimeLock()`
4. Smart contract verifies time has passed and sends funds back to owner

### State Management
- **WalletContext** — Global wallet connection state via React Context
- **useLocks hook** — Manages lock data, currently with mock data fallback
- **useContracts hook** — Low-level contract interaction (ABI encoding, tx sending)

## Design System

- **Background**: Dark navy gradient (`#1a1040` → `#0a0e1a`)
- **Cards**: Dark glass-morphism style (`#1a2035` → `#111827`)
- **Primary accent**: Orange (`#f97316`)
- **Secondary accent**: Purple (`#8b5cf6`)
- **Text**: White headings, gray-400 body text
- **Borders**: `white/5` or `white/10` opacity
- **Border radius**: `rounded-xl` (cards), `rounded-full` (buttons, badges)

## Key Conventions

1. **No default exports for hooks** — Named exports for `useWallet()`, `useLocks()`
2. **Components are default exports** — One component per file
3. **Types in `types/index.ts`** — Shared across the app
4. **Contract addresses are constants** — Update in `useContracts.ts` after deployment
5. **Mock data fallback** — `useLocks` uses mock locks when contracts aren't deployed
6. **CSS via Tailwind utility classes** — Custom properties defined in `@theme` block in `index.css`
7. **No external UI library** — All components built with Tailwind classes

## Common Tasks for AI Assistants

- **Add a new cryptocurrency**: Add to `CRYPTO_ASSETS` in `src/types/index.ts`
- **Change contract address**: Update `ETH_TIMELOCK_ADDRESS` or `SOLANA_PROGRAM_ID` in `src/hooks/useContracts.ts`
- **Add a new page**: Create in `src/pages/`, add route in `src/App.tsx`
- **Modify theme colors**: Edit the `@theme` block in `src/index.css`
- **Add ERC-20 token support**: Implement token approval + `createTokenLock()` call in `useContracts.ts`
