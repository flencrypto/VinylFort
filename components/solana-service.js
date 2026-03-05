/**
 * VinylVault Solana Service
 *
 * Handles Phantom / Backpack wallet connection and on-chain minting via the
 * VinylVault Anchor program deployed on Solana devnet / mainnet.
 *
 * Dependencies: @solana/web3.js (loaded via CDN before this script).
 *
 * Usage:
 *   const info = await VinylVaultSolana.connectWallet();
 *   const result = await VinylVaultSolana.mintRecordNFT(tokenId, metadata);
 *
 * Contract:
 *   Replace VINYLVAULT_PROGRAM_ID with the program address printed by
 *   `anchor deploy`.  Set to null to disable on-chain minting (falls back
 *   to CONTRACT_NOT_CONFIGURED error so the UI can handle it gracefully).
 *
 * ⚠️  This script handles only CLIENT-SIDE wallet interaction.  It never
 *     stores private keys.  All transaction signing happens inside the
 *     user's wallet extension.
 */

/* ------------------------------------------------------------------ */
/*  Configuration                                                       */
/* ------------------------------------------------------------------ */

/**
 * Deployed Anchor program address.
 * Replace with the value from `anchor deploy` output.
 * Example format: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
 * @type {string|null}
 */
const VINYLVAULT_PROGRAM_ID = null; // TODO: set after `anchor deploy`

/** Solana cluster to target.  Switch to "mainnet-beta" for production. */
const SOLANA_NETWORK = "devnet";

/* ------------------------------------------------------------------ */
/*  Internal state                                                      */
/* ------------------------------------------------------------------ */

const _solState = {
  account: null,
  connection: null,
  wallet: null,
};

const _solListeners = { accountChange: [] };

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function _notifySolAccountChange(account) {
  _solListeners.accountChange.forEach((cb) => {
    try { cb(account); } catch (_e) { /* ignore */ }
  });
}

function _isSolanaWalletAvailable() {
  return typeof window !== "undefined" && Boolean(window.solana || window.backpack);
}

function _getSolanaProvider() {
  if (typeof window === "undefined") return null;
  if (window.solana?.isPhantom) return window.solana;
  if (window.backpack) return window.backpack;
  if (window.solana) return window.solana;
  return null;
}

function _isSolWeb3Available() {
  return typeof window !== "undefined" && typeof window.solanaWeb3 !== "undefined";
}

/* ------------------------------------------------------------------ */
/*  Public API — VinylVaultSolana                                       */
/* ------------------------------------------------------------------ */

const VinylVaultSolana = {
  isConnected() { return Boolean(_solState.account); },
  getAccount()  { return _solState.account; },
  getNetworkName() {
    return SOLANA_NETWORK === "mainnet-beta" ? "Solana Mainnet" : "Solana Devnet";
  },
  getShortAddress() {
    const a = _solState.account;
    return a ? a.slice(0, 4) + "…" + a.slice(-4) : "";
  },
  isWalletAvailable: _isSolanaWalletAvailable,

  /**
   * Connect the user's Solana wallet (Phantom, Backpack, etc.).
   * @returns {Promise<{account: string, networkName: string}>}
   */
  async connectWallet() {
    const provider = _getSolanaProvider();
    if (!provider) {
      throw new Error(
        "No Solana wallet detected. " +
        "Please install Phantom (phantom.app) or Backpack (backpack.app)."
      );
    }
    if (!_isSolWeb3Available()) {
      throw new Error(
        "@solana/web3.js is not loaded. " +
        "Ensure the CDN script is included before solana-service.js."
      );
    }

    const resp = await provider.connect();
    _solState.account = resp.publicKey.toString();
    _solState.wallet = provider;

    const endpoint = window.solanaWeb3.clusterApiUrl(SOLANA_NETWORK);
    _solState.connection = new window.solanaWeb3.Connection(endpoint, "confirmed");

    provider.on("accountChanged", (pubKey) => {
      _solState.account = pubKey ? pubKey.toString() : null;
      _notifySolAccountChange(_solState.account);
    });

    _notifySolAccountChange(_solState.account);
    return { account: _solState.account, networkName: this.getNetworkName() };
  },

  /** Clear local state (the wallet extension itself stays connected). */
  disconnectWallet() {
    if (_solState.wallet) {
      _solState.wallet.disconnect().catch(() => {});
    }
    _solState.account = null;
    _solState.wallet = null;
    _solState.connection = null;
    _notifySolAccountChange(null);
  },

  /**
   * Mint a vinyl-record certificate NFT via the VinylVault Anchor program.
   *
   * Builds and signs a transaction that calls `mint_record_nft` on-chain.
   * The user must approve the transaction in their wallet extension.
   *
   * @param {string} tokenId  Off-chain VinylVault token ID (e.g. "VX-A1B2-C3D4").
   * @param {object} metadata Record metadata { artist, title, year, catno, condition }.
   * @returns {Promise<{txHash: string, tokenId: string, explorerUrl: string}>}
   */
  async mintRecordNFT(tokenId, metadata) {
    if (!VINYLVAULT_PROGRAM_ID) {
      const err = new Error(
        "Solana program is not configured. " +
        "Set VINYLVAULT_PROGRAM_ID in components/solana-service.js after running `anchor deploy`."
      );
      err.code = "CONTRACT_NOT_CONFIGURED";
      throw err;
    }

    if (!_isSolWeb3Available()) {
      throw new Error("@solana/web3.js is not available.");
    }

    if (!this.isConnected()) {
      await this.connectWallet();
    }

    const { PublicKey, SystemProgram, Transaction, TransactionInstruction, Keypair } = window.solanaWeb3;

    // All record metadata is stored in the on-chain RecordCertificate PDA, so
    // no off-chain URI is required.  The on-chain constraint is max_len(200) for
    // metadata_uri; passing an empty string keeps us safely within that limit.
    const metadataUri = "";

    // Encode instruction data (Borsh-style: length-prefixed strings).
    const enc = new TextEncoder();
    const encStr = (s) => {
      const b = enc.encode(s);
      const len = new Uint8Array(4);
      new DataView(len.buffer).setUint32(0, b.length, true);
      return [len, b];
    };

    // Anchor discriminator for `mint_record_nft` = sha256("global:mint_record_nft")[0..8].
    // Pre-computed value — to regenerate after any instruction rename, run:
    //   node -e "const c=require('crypto');console.log(JSON.stringify([...c.createHash('sha256').update('global:mint_record_nft').digest().slice(0,8)]))"
    const discriminator = new Uint8Array([52, 200, 137, 194, 91, 73, 56, 222]);

    const parts = [
      discriminator,
      ...encStr(tokenId),
      ...encStr(metadata.artist    || ""),
      ...encStr(metadata.title     || ""),
      ...encStr(metadata.year      || ""),
      ...encStr(metadata.catno     || ""),
      ...encStr(metadata.condition || ""),
      ...encStr(metadataUri),
    ];
    const totalLen = parts.reduce((n, p) => n + p.length, 0);
    const data = new Uint8Array(totalLen);
    let off = 0;
    for (const p of parts) { data.set(p, off); off += p.length; }

    // Fresh keypair for the mint account (caller co-signs).
    const mintKp = Keypair.generate();
    const programId = new PublicKey(VINYLVAULT_PROGRAM_ID);
    const authority = new PublicKey(_solState.account);

    // Well-known Solana program addresses.
    const TOKEN_PROGRAM_ID = new PublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    );
    const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
    );
    const RENT_SYSVAR_ID = new PublicKey(
      "SysvarRent111111111111111111111111111111111"
    );

    // Derive certificate PDA: seeds = ["record-cert", mint.key()].
    const [certPda] = await PublicKey.findProgramAddress(
      [Buffer.from("record-cert"), mintKp.publicKey.toBuffer()],
      programId
    );

    // Derive the associated token account (ATA) for the authority and new mint.
    const [tokenAccount] = await PublicKey.findProgramAddress(
      [
        authority.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKp.publicKey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Build a proper TransactionInstruction matching the Anchor MintRecordNft
    // accounts struct order: authority, mint, token_account, certificate,
    // system_program, token_program, associated_token_program, rent.
    const instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: authority,                    isSigner: true,  isWritable: true  },
        { pubkey: mintKp.publicKey,             isSigner: true,  isWritable: true  },
        { pubkey: tokenAccount,                 isSigner: false, isWritable: true  },
        { pubkey: certPda,                      isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId,      isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID,             isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
        { pubkey: RENT_SYSVAR_ID,               isSigner: false, isWritable: false },
      ],
      data: Buffer.from(data),
    });

    const { blockhash } = await _solState.connection.getLatestBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: authority });
    tx.add(instruction);
    tx.partialSign(mintKp);

    const signedTx = await _solState.wallet.signTransaction(tx);
    const rawTx = signedTx.serialize();
    const signature = await _solState.connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await _solState.connection.confirmTransaction(signature, "confirmed");

    const explorerUrl =
      SOLANA_NETWORK === "mainnet-beta"
        ? `https://explorer.solana.com/tx/${signature}`
        : `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

    return { txHash: signature, tokenId, explorerUrl };
  },

  onAccountChange(callback) {
    if (typeof callback === "function") {
      _solListeners.accountChange.push(callback);
    }
  },

  // Expose helpers for UI use
  shortAddress: (a) => (a ? a.slice(0, 4) + "…" + a.slice(-4) : ""),
};

window.VinylVaultSolana = VinylVaultSolana;
