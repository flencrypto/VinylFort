use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::error::VinylVaultError;
use crate::state::RecordCertificate;

/* ------------------------------------------------------------------ */
/*  Accounts                                                            */
/* ------------------------------------------------------------------ */

#[derive(Accounts)]
#[instruction(args: MintRecordArgs)]
pub struct MintRecordNft<'info> {
    /// The wallet that is minting and paying for the certificate.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Freshly-generated SPL token mint (decimals = 0, supply = 1).
    /// The keypair must be passed in by the client and signed as a co-signer.
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = authority,
        mint::freeze_authority = authority,
    )]
    pub mint: Account<'info, Mint>,

    /// Associated token account that will hold the single NFT.
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// PDA that permanently stores the record metadata on-chain.
    /// Seeds: ["record-cert", mint.key()]
    #[account(
        init,
        payer = authority,
        space = RecordCertificate::SPACE,
        seeds = [b"record-cert", mint.key().as_ref()],
        bump,
    )]
    pub certificate: Account<'info, RecordCertificate>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

/* ------------------------------------------------------------------ */
/*  Instruction arguments                                               */
/* ------------------------------------------------------------------ */

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MintRecordArgs {
    /// VinylVault off-chain token identifier (max 32 bytes).
    pub token_id: String,
    /// Artist name (max 128 bytes).
    pub artist: String,
    /// Album / record title (max 128 bytes).
    pub title: String,
    /// Release year string, e.g. "1972" (max 16 bytes).
    pub year: String,
    /// Catalogue number (max 64 bytes).
    pub catno: String,
    /// Grading condition, e.g. "NM" (max 32 bytes).
    pub condition: String,
    /// Optional URI to off-chain JSON metadata (max 200 bytes).
    pub metadata_uri: String,
}

/* ------------------------------------------------------------------ */
/*  Handler                                                             */
/* ------------------------------------------------------------------ */

pub fn handler(ctx: Context<MintRecordNft>, args: MintRecordArgs) -> Result<()> {
    // --- Validate string lengths against on-chain constraints ---
    require!(args.token_id.len() <= 32, VinylVaultError::StringTooLong);
    require!(args.artist.len() <= 128, VinylVaultError::StringTooLong);
    require!(args.title.len() <= 128, VinylVaultError::StringTooLong);
    require!(args.year.len() <= 16, VinylVaultError::StringTooLong);
    require!(args.catno.len() <= 64, VinylVaultError::StringTooLong);
    require!(args.condition.len() <= 32, VinylVaultError::StringTooLong);
    require!(args.metadata_uri.len() <= 200, VinylVaultError::StringTooLong);

    // --- Mint exactly 1 token to the authority's associated token account ---
    anchor_spl::token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        1,
    )?;

    // --- Remove mint authority — makes this a true 1/1 non-fungible token ---
    anchor_spl::token::set_authority(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::SetAuthority {
                current_authority: ctx.accounts.authority.to_account_info(),
                account_or_mint: ctx.accounts.mint.to_account_info(),
            },
        ),
        anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
        None,
    )?;

    // --- Populate the RecordCertificate PDA ---
    let cert = &mut ctx.accounts.certificate;
    cert.authority = ctx.accounts.authority.key();
    cert.mint = ctx.accounts.mint.key();
    cert.token_id = args.token_id;
    cert.artist = args.artist;
    cert.title = args.title;
    cert.year = args.year;
    cert.catno = args.catno;
    cert.condition = args.condition;
    cert.metadata_uri = args.metadata_uri;
    cert.minted_at = Clock::get()?.unix_timestamp;
    // NOTE: Solana's on-chain clock can be influenced by validators within a
    // small bounded range (~±few seconds). For certificate timestamping this
    // precision is sufficient; for applications requiring stricter guarantees
    // an off-chain oracle (e.g. Chainlink) should be used instead.
    cert.bump = ctx.bumps.certificate;

    Ok(())
}
