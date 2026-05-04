use anchor_lang::prelude::*; // imports all core Anchor types: Account, Pubkey, Result, etc.
use anchor_lang::system_program::{transfer, Transfer}; // imports SOL transfer CPI helpers

#[cfg(test)] // only compile this module when running tests
mod tests; // loads tests.rs as a submodule

declare_id!("FswM4MeUkcEii2KFeSvJDx6edVP4RCWrCFyaZT6EtUrj"); // hardcodes the program's on-chain address

#[program] // marks this module as the Anchor program — all public fns become instructions
pub mod marketplace {
    use super::*; // bring parent scope (accounts, types, errors) into this module

    pub fn create_asset(
        ctx: Context<CreateAsset>, // Context holds all validated accounts for this instruction
        asset_id: String,          // unique identifier for the asset (e.g. filename or UUID)
        price: u64,                // price in lamports (1 SOL = 1_000_000_000 lamports)
        license_type: LicenseType, // enum: Personal or Commercial
    ) -> Result<()> {
        require!(price > 0, MarketplaceError::InvalidPrice); // reject zero-price assets
        require!(asset_id.len() <= 64, MarketplaceError::AssetIdTooLong); // enforce max ID length

        let asset = &mut ctx.accounts.asset; // get mutable reference to the Asset PDA account
        asset.creator = ctx.accounts.creator.key(); // store creator's wallet address
        asset.asset_id = asset_id;                  // store the asset identifier
        asset.price = price;                         // store the price
        asset.license_type = license_type;           // store Personal or Commercial
        asset.bump = ctx.bumps.asset;                // store PDA bump seed for future signing

        Ok(())
    }

    pub fn purchase_asset(ctx: Context<PurchaseAsset>) -> Result<()> {
        let asset = &ctx.accounts.asset; // read the asset being purchased

        // Transfer SOL from buyer to creator using a Cross-Program Invocation (CPI) to System Program
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(), // System Program handles SOL transfers
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),   // deduct from buyer's wallet
                    to: ctx.accounts.creator.to_account_info(),   // send to creator's wallet
                },
            ),
            asset.price, // amount to transfer in lamports
        )?; // the ? propagates any error up

        // Create the Purchase PDA — this acts as the on-chain license proof
        let purchase = &mut ctx.accounts.purchase;
        purchase.buyer = ctx.accounts.buyer.key();       // record who bought it
        purchase.asset = ctx.accounts.asset.key();       // record which asset was bought
        purchase.license_type = asset.license_type.clone(); // copy license type from asset
        purchase.purchased_at = Clock::get()?.unix_timestamp; // record current blockchain timestamp
        purchase.bump = ctx.bumps.purchase;              // store bump seed for future verification

        Ok(())
    }

    pub fn verify_license(ctx: Context<VerifyLicense>) -> Result<()> {
        // If this instruction succeeds at all, the Purchase PDA exists and seeds are valid
        // Anchor already checked the PDA seeds before we get here — so existence = valid license
        let purchase = &ctx.accounts.purchase;

        require!(
            purchase.buyer == ctx.accounts.buyer.key(), // confirm PDA belongs to this exact buyer
            MarketplaceError::Unauthorized
        );

        // Log verification result to the transaction logs (visible on explorers)
        msg!(
            "License verified: buyer={} asset={} type={:?}",
            purchase.buyer,
            purchase.asset,
            purchase.license_type
        );

        Ok(())
    }
}

// ----------------------------------------------------------------
// Account structs — define what data is stored in each on-chain account
// ----------------------------------------------------------------

#[account] // marks this as an Anchor-managed on-chain account
pub struct Asset {
    pub creator: Pubkey,           // 32 bytes — wallet address of the creator
    pub asset_id: String,          // 4 bytes (length prefix) + up to 64 bytes
    pub price: u64,                // 8 bytes — price in lamports
    pub license_type: LicenseType, // 1 byte — Personal or Commercial enum variant
    pub bump: u8,                  // 1 byte — PDA bump seed
}

impl Asset {
    // total space to allocate: 8 (Anchor discriminator) + all fields
    pub const LEN: usize = 8 + 32 + (4 + 64) + 8 + 1 + 1;
}

#[account]
pub struct Purchase {
    pub buyer: Pubkey,             // 32 bytes — wallet that purchased the license
    pub asset: Pubkey,             // 32 bytes — the Asset PDA that was purchased
    pub license_type: LicenseType, // 1 byte — license type inherited from asset
    pub purchased_at: i64,         // 8 bytes — unix timestamp of purchase
    pub bump: u8,                  // 1 byte — PDA bump seed
}

impl Purchase {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 1;
}

// ----------------------------------------------------------------
// Instruction contexts — define which accounts each instruction requires
// ----------------------------------------------------------------

#[derive(Accounts)]
#[instruction(asset_id: String)] // exposes asset_id to the account constraints below
pub struct CreateAsset<'info> {
    #[account(mut)] // mut because creator pays for account rent (lamports deducted)
    pub creator: Signer<'info>, // must sign the transaction

    #[account(
        init,                  // create this account for the first time
        payer = creator,       // creator pays the rent-exempt deposit
        space = Asset::LEN,    // allocate exactly this many bytes
        seeds = [b"asset", creator.key().as_ref(), asset_id.as_bytes()], // PDA seeds: "asset" + creator pubkey + asset_id
        bump,                  // Anchor finds and stores the canonical bump
    )]
    pub asset: Account<'info, Asset>, // the new Asset account to be created

    pub system_program: Program<'info, System>, // required for account creation and SOL transfers
}

#[derive(Accounts)]
pub struct PurchaseAsset<'info> {
    #[account(mut)] // mut because lamports are deducted from buyer
    pub buyer: Signer<'info>, // must sign the transaction

    #[account(mut)] // mut because lamports are added to creator
    pub creator: SystemAccount<'info>, // creator's wallet (doesn't need to sign)

    #[account(
        seeds = [b"asset", creator.key().as_ref(), asset.asset_id.as_bytes()], // derive asset PDA
        bump = asset.bump,     // use stored bump to verify PDA
        has_one = creator,     // ensures asset.creator matches the creator account passed in
    )]
    pub asset: Account<'info, Asset>, // the existing asset being purchased

    #[account(
        init,                  // create purchase record for the first time
        payer = buyer,         // buyer pays rent for the purchase account
        space = Purchase::LEN,
        seeds = [b"purchase", buyer.key().as_ref(), asset.key().as_ref()], // unique per buyer+asset pair
        bump,
    )]
    pub purchase: Account<'info, Purchase>, // the new license proof account

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyLicense<'info> {
    pub buyer: SystemAccount<'info>, // wallet to verify license for (doesn't need to sign)

    pub asset: Account<'info, Asset>, // the asset to check license against

    #[account(
        seeds = [b"purchase", buyer.key().as_ref(), asset.key().as_ref()], // must match exact buyer+asset
        bump = purchase.bump,  // verify with stored bump — if PDA doesn't exist, instruction fails here
    )]
    pub purchase: Account<'info, Purchase>, // the license proof — its existence proves ownership
}

// ----------------------------------------------------------------
// Types & errors
// ----------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// AnchorSerialize/Deserialize: can be stored on-chain and read back
// Clone: can be copied (needed when assigning license_type from asset to purchase)
// Debug: enables {:?} formatting in msg!()
// PartialEq: enables == comparisons
pub enum LicenseType {
    Personal,   // variant 0 — stored as 0u8 on-chain
    Commercial, // variant 1 — stored as 1u8 on-chain
}

#[error_code] // generates error codes starting at 6000 (Anchor convention)
pub enum MarketplaceError {
    #[msg("Price must be greater than zero")]
    InvalidPrice,    // thrown when price == 0

    #[msg("Asset ID must be 64 characters or less")]
    AssetIdTooLong,  // thrown when asset_id.len() > 64

    #[msg("Buyer does not own a license for this asset")]
    Unauthorized,    // thrown when purchase.buyer != provided buyer pubkey
}