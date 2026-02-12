use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("MoonVau1tT1meLockProgram11111111111111111111");

#[program]
pub mod moonvault_timelock {
    use super::*;

    /// Create a time lock for native SOL.
    /// Transfers `amount` lamports from the user to the vault PDA.
    /// Funds are locked until `unlock_time` (Unix timestamp).
    pub fn create_sol_lock(
        ctx: Context<CreateSolLock>,
        amount: u64,
        unlock_time: i64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        require!(unlock_time > clock.unix_timestamp, MoonVaultError::UnlockTimeInPast);
        require!(amount > 0, MoonVaultError::ZeroAmount);

        // Transfer SOL from user to vault
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.owner.key(),
            &ctx.accounts.vault.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let lock = &mut ctx.accounts.lock_account;
        lock.owner = ctx.accounts.owner.key();
        lock.token_mint = Pubkey::default(); // default = native SOL
        lock.amount = amount;
        lock.unlock_time = unlock_time;
        lock.withdrawn = false;
        lock.bump = ctx.bumps.vault;

        emit!(LockCreated {
            owner: lock.owner,
            token_mint: lock.token_mint,
            amount,
            unlock_time,
        });

        Ok(())
    }

    /// Create a time lock for an SPL token.
    /// Transfers `amount` tokens from the user's token account to the vault token account.
    pub fn create_token_lock(
        ctx: Context<CreateTokenLock>,
        amount: u64,
        unlock_time: i64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        require!(unlock_time > clock.unix_timestamp, MoonVaultError::UnlockTimeInPast);
        require!(amount > 0, MoonVaultError::ZeroAmount);

        // Transfer tokens from user to vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        let lock = &mut ctx.accounts.lock_account;
        lock.owner = ctx.accounts.owner.key();
        lock.token_mint = ctx.accounts.token_mint.key();
        lock.amount = amount;
        lock.unlock_time = unlock_time;
        lock.withdrawn = false;
        lock.bump = ctx.bumps.vault;

        emit!(LockCreated {
            owner: lock.owner,
            token_mint: lock.token_mint,
            amount,
            unlock_time,
        });

        Ok(())
    }

    /// Withdraw native SOL from an expired lock.
    pub fn withdraw_sol(ctx: Context<WithdrawSol>) -> Result<()> {
        let lock = &ctx.accounts.lock_account;
        let clock = Clock::get()?;

        require!(!lock.withdrawn, MoonVaultError::AlreadyWithdrawn);
        require!(clock.unix_timestamp >= lock.unlock_time, MoonVaultError::StillLocked);

        // Transfer SOL from vault PDA back to owner
        let amount = lock.amount;
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += amount;

        let lock = &mut ctx.accounts.lock_account;
        lock.withdrawn = true;

        emit!(Withdrawn {
            owner: lock.owner,
            amount,
        });

        Ok(())
    }

    /// Withdraw SPL tokens from an expired lock.
    pub fn withdraw_token(ctx: Context<WithdrawToken>) -> Result<()> {
        let lock = &ctx.accounts.lock_account;
        let clock = Clock::get()?;

        require!(!lock.withdrawn, MoonVaultError::AlreadyWithdrawn);
        require!(clock.unix_timestamp >= lock.unlock_time, MoonVaultError::StillLocked);

        let amount = lock.amount;
        let owner_key = ctx.accounts.owner.key();
        let seeds = &[b"vault", owner_key.as_ref(), &[lock.bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, amount)?;

        let lock = &mut ctx.accounts.lock_account;
        lock.withdrawn = true;

        emit!(Withdrawn {
            owner: lock.owner,
            amount,
        });

        Ok(())
    }
}

// ----- Accounts -----

#[derive(Accounts)]
pub struct CreateSolLock<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + LockAccount::INIT_SPACE,
        seeds = [b"lock", owner.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump,
    )]
    pub lock_account: Account<'info, LockAccount>,

    /// CHECK: PDA used as vault for holding SOL
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateTokenLock<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + LockAccount::INIT_SPACE,
        seeds = [b"lock", owner.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump,
    )]
    pub lock_account: Account<'info, LockAccount>,

    /// CHECK: PDA used as vault authority
    #[account(
        seeds = [b"vault", owner.key().as_ref()],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,

    /// CHECK: Token mint for the locked asset
    pub token_mint: UncheckedAccount<'info>,

    #[account(mut, constraint = user_token_account.owner == owner.key())]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault_token_account.owner == vault.key())]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        constraint = lock_account.owner == owner.key() @ MoonVaultError::NotOwner,
    )]
    pub lock_account: Account<'info, LockAccount>,

    /// CHECK: PDA vault holding the SOL
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = lock_account.bump,
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawToken<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        constraint = lock_account.owner == owner.key() @ MoonVaultError::NotOwner,
    )]
    pub lock_account: Account<'info, LockAccount>,

    /// CHECK: PDA vault authority
    #[account(
        seeds = [b"vault", owner.key().as_ref()],
        bump = lock_account.bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_token_account.owner == owner.key())]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ----- State -----

#[account]
#[derive(InitSpace)]
pub struct LockAccount {
    pub owner: Pubkey,
    pub token_mint: Pubkey,   // Pubkey::default() for native SOL
    pub amount: u64,
    pub unlock_time: i64,
    pub withdrawn: bool,
    pub bump: u8,
}

// ----- Events -----

#[event]
pub struct LockCreated {
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub unlock_time: i64,
}

#[event]
pub struct Withdrawn {
    pub owner: Pubkey,
    pub amount: u64,
}

// ----- Errors -----

#[error_code]
pub enum MoonVaultError {
    #[msg("Unlock time must be in the future")]
    UnlockTimeInPast,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("You are not the owner of this lock")]
    NotOwner,
    #[msg("Lock period has not ended yet")]
    StillLocked,
    #[msg("Funds have already been withdrawn")]
    AlreadyWithdrawn,
}
