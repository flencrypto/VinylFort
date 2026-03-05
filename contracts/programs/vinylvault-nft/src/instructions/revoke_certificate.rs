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
pub struct RevokeCertificate<'info> {
    /// The original minter — must match `certificate.authority`.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The RecordCertificate PDA to close.
    /// Verified against the mint and authority; rent returned to `authority`.
    #[account(
        mut,
        constraint = certificate.mint == mint.key() @ VinylVaultError::MintMismatch,
        constraint = certificate.authority == authority.key() @ VinylVaultError::Unauthorised,
        seeds = [b"record-cert", mint.key().as_ref()],
        bump = certificate.bump,
        close = authority,
    )]
    pub certificate: Account<'info, RecordCertificate>,

    /// The SPL token mint for this certificate.
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// The authority's associated token account holding the NFT.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/* ------------------------------------------------------------------ */
/*  Handler                                                             */
/* ------------------------------------------------------------------ */

pub fn handler(ctx: Context<RevokeCertificate>) -> Result<()> {
    // --- Burn the single NFT token ---
    anchor_spl::token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        1,
    )?;

    // --- Close the token account, returning rent to the authority ---
    anchor_spl::token::close_account(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::CloseAccount {
                account: ctx.accounts.token_account.to_account_info(),
                destination: ctx.accounts.authority.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
    )?;

    // The RecordCertificate PDA is closed and rent reclaimed via the
    // `close = authority` constraint in the Accounts struct above.

    Ok(())
}
