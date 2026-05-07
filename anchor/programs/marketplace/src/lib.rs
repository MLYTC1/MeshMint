use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

#[cfg(test)]
mod tests;

declare_id!("3z9VVHRqRW8ywzy2mtkpmDAGMjqgGkz8iz1dtXGs75xH");

// --- Marketplace constants ----------------------------------------------------

/// Hardcoded treasury wallet (devnet). Receives the platform fee.
/// Replace with the production treasury before mainnet.
pub const TREASURY_PUBKEY: Pubkey =
    pubkey!("AAaJbDC4HsLyHb59iFovqgAZpe39WDHnE9DRdUXErxEY");

/// Platform fee in basis points (5% = 500 bps).
pub const PLATFORM_FEE_BPS: u64 = 500;

/// Maximum on-chain length for the asset_id (string).
/// The `asset_id` is also the off-chain metadata pointer (e.g. an IPFS CID or
/// short URL): binary 3D content is NEVER stored on chain.
pub const MAX_ASSET_ID_LEN: usize = 96;

#[program]
pub mod marketplace {
    use super::*;

    /// Create a new asset listing.
    ///
    /// `asset_id`     — unique identifier AND off-chain metadata pointer
    ///                  (IPFS CID, https URL, or short slug). Binary content
    ///                  (3D models, textures) is NEVER stored on chain — only
    ///                  this pointer.
    /// `price`        — price in lamports (must be > 0).
    /// `license_type` — Personal / Commercial / Extended.
    pub fn create_asset(
        ctx: Context<CreateAsset>,
        asset_id: String,
        price: u64,
        license_type: LicenseType,
    ) -> Result<()> {
        require!(price > 0, MarketplaceError::InvalidPrice);
        require!(!asset_id.is_empty(), MarketplaceError::AssetIdTooShort);
        require!(
            asset_id.len() <= MAX_ASSET_ID_LEN,
            MarketplaceError::AssetIdTooLong
        );

        let asset = &mut ctx.accounts.asset;
        asset.creator = ctx.accounts.creator.key();
        asset.asset_id = asset_id;
        asset.price = price;
        asset.license_type = license_type;
        asset.created_at = Clock::get()?.unix_timestamp;
        asset.bump = ctx.bumps.asset;

        Ok(())
    }

    /// Purchase an asset license. Splits the price between the creator (95%)
    /// and the platform treasury (5%), and mints a Purchase PDA proof.
    pub fn purchase_asset(ctx: Context<PurchaseAsset>) -> Result<()> {
        let asset = &ctx.accounts.asset;

        let (creator_amount, treasury_amount) = split_fee(asset.price)?;

        // 95% (or remainder) to creator
        if creator_amount > 0 {
            transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.creator.to_account_info(),
                    },
                ),
                creator_amount,
            )?;
        }

        // 5% platform fee to treasury
        if treasury_amount > 0 {
            transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                ),
                treasury_amount,
            )?;
        }

        // Mint the Purchase PDA = on-chain license proof
        let purchase = &mut ctx.accounts.purchase;
        purchase.buyer = ctx.accounts.buyer.key();
        purchase.asset = ctx.accounts.asset.key();
        purchase.license_type = asset.license_type.clone();
        purchase.price_paid = asset.price;
        purchase.purchased_at = Clock::get()?.unix_timestamp;
        purchase.bump = ctx.bumps.purchase;

        Ok(())
    }

    /// Verify that the given buyer holds a valid license PDA for the asset.
    pub fn verify_license(ctx: Context<VerifyLicense>) -> Result<()> {
        let purchase = &ctx.accounts.purchase;

        require!(
            purchase.buyer == ctx.accounts.buyer.key(),
            MarketplaceError::Unauthorized
        );
        require!(
            purchase.asset == ctx.accounts.asset.key(),
            MarketplaceError::Unauthorized
        );

        msg!(
            "License verified: buyer={} asset={} type={:?}",
            purchase.buyer,
            purchase.asset,
            purchase.license_type
        );

        Ok(())
    }
}

// --- Helpers -----------------------------------------------------------------

/// Split a price between the platform treasury and the creator.
/// Treasury gets PLATFORM_FEE_BPS / 10_000, creator gets the remainder.
/// Uses u128 internally to avoid overflow on large prices.
fn split_fee(price: u64) -> Result<(u64, u64)> {
    let treasury_amount = (price as u128)
        .checked_mul(PLATFORM_FEE_BPS as u128)
        .ok_or(MarketplaceError::FeeMathOverflow)?
        .checked_div(10_000u128)
        .ok_or(MarketplaceError::FeeMathOverflow)? as u64;
    let creator_amount = price
        .checked_sub(treasury_amount)
        .ok_or(MarketplaceError::FeeMathOverflow)?;
    Ok((creator_amount, treasury_amount))
}

// --- Account structs ---------------------------------------------------------

#[account]
pub struct Asset {
    pub creator: Pubkey,           // 32
    pub asset_id: String,          // 4 + MAX_ASSET_ID_LEN
    pub price: u64,                // 8
    pub license_type: LicenseType, // 1
    pub created_at: i64,           // 8
    pub bump: u8,                  // 1
}

impl Asset {
    pub const LEN: usize = 8 + 32 + (4 + MAX_ASSET_ID_LEN) + 8 + 1 + 8 + 1;
}

#[account]
pub struct Purchase {
    pub buyer: Pubkey,             // 32
    pub asset: Pubkey,             // 32
    pub license_type: LicenseType, // 1
    pub price_paid: u64,           // 8
    pub purchased_at: i64,         // 8
    pub bump: u8,                  // 1
}

impl Purchase {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 8 + 1;
}

// --- Instruction contexts ----------------------------------------------------

#[derive(Accounts)]
#[instruction(asset_id: String)]
pub struct CreateAsset<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = Asset::LEN,
        seeds = [b"asset", creator.key().as_ref(), asset_id.as_bytes()],
        bump,
    )]
    pub asset: Account<'info, Asset>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseAsset<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub creator: SystemAccount<'info>,

    #[account(
        mut,
        address = TREASURY_PUBKEY @ MarketplaceError::InvalidTreasury,
    )]
    pub treasury: SystemAccount<'info>,

    #[account(
        seeds = [b"asset", creator.key().as_ref(), asset.asset_id.as_bytes()],
        bump = asset.bump,
        has_one = creator,
    )]
    pub asset: Account<'info, Asset>,

    #[account(
        init,
        payer = buyer,
        space = Purchase::LEN,
        seeds = [b"purchase", buyer.key().as_ref(), asset.key().as_ref()],
        bump,
    )]
    pub purchase: Account<'info, Purchase>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyLicense<'info> {
    pub buyer: SystemAccount<'info>,

    pub asset: Account<'info, Asset>,

    #[account(
        seeds = [b"purchase", buyer.key().as_ref(), asset.key().as_ref()],
        bump = purchase.bump,
    )]
    pub purchase: Account<'info, Purchase>,
}

// --- Types & errors ----------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum LicenseType {
    /// Personal use only — no commercial rights, no resale.
    Personal,
    /// Commercial use allowed — no resale.
    Commercial,
    /// Commercial + resellable / sublicensable.
    Extended,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("Price must be greater than zero")]
    InvalidPrice,

    #[msg("Asset ID must not be empty")]
    AssetIdTooShort,

    #[msg("Asset ID exceeds maximum length")]
    AssetIdTooLong,

    #[msg("Buyer does not own a license for this asset")]
    Unauthorized,

    #[msg("Treasury account does not match the program treasury")]
    InvalidTreasury,

    #[msg("Fee math overflow")]
    FeeMathOverflow,
}
