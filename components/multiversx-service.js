/**
 * VinylVault MultiversX Service
 *
 * Handles xPortal Web / DeFi wallet connection and ESDT NFT minting via the
 * VinylVault certificate smart contract on the MultiversX blockchain.
 *
 * Dependencies: MultiversX xPortal Web browser extension.
 *
 * Usage:
 *   const info = await VinylVaultMultiversX.connectWallet();
 *   const result = await VinylVaultMultiversX.mintRecordNFT(tokenId, metadata);
 *
 * Contract:
 *   Replace VINYLVAULT_MVRX_CONTRACT with the bech32 address printed by
 *   `mxpy contract deploy`.  Set to null to get a CONTRACT_NOT_CONFIGURED
 *   error that the UI handles gracefully.
 *
 * ⚠️  This script handles only CLIENT-SIDE wallet interaction.  It never
 *     stores private keys.  All signing happens inside the user's xPortal
 *     or DeFi wallet extension.
 */

/* ------------------------------------------------------------------ */
/*  Configuration                                                       */
/* ------------------------------------------------------------------ */

/**
 * Deployed MultiversX smart contract address (bech32 format, starts with "erd1").
 * Example format: "erd1qqqqqqqqqqqqqpgq..."
 * @type {string|null}
 */
const VINYLVAULT_MVRX_CONTRACT = null; // TODO: set after `mxpy contract deploy`

/** Target network.  Values: "mainnet" | "devnet" | "testnet" */
const MVRX_NETWORK = "devnet";

const _MVRX_API_URLS = {
  mainnet: "https://api.multiversx.com",
  devnet:  "https://devnet-api.multiversx.com",
  testnet: "https://testnet-api.multiversx.com",
};

const _MVRX_EXPLORER_URLS = {
  mainnet: "https://explorer.multiversx.com",
  devnet:  "https://devnet-explorer.multiversx.com",
  testnet: "https://testnet-explorer.multiversx.com",
};

const _MVRX_CHAIN_IDS = { mainnet: "1", devnet: "D", testnet: "T" };

/* ------------------------------------------------------------------ */
/*  Internal state                                                      */
/* ------------------------------------------------------------------ */

const _mvrxState = { account: null, wallet: null };
const _mvrxListeners = { accountChange: [] };

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function _notifyMvrxAccountChange(account) {
  _mvrxListeners.accountChange.forEach((cb) => {
    try { cb(account); } catch (_e) { /* ignore */ }
  });
}

function _isMvrxWalletAvailable() {
  return (
    typeof window !== "undefined" &&
    (Boolean(window.multiversx) || Boolean(window.elrondWallet))
  );
}

function _getMvrxProvider() {
  if (typeof window === "undefined") return null;
  return window.multiversx || window.elrondWallet || null;
}

/** Encode a UTF-8 string as lowercase hex. */
function _toHex(str) {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ------------------------------------------------------------------ */
/*  Public API — VinylVaultMultiversX                                   */
/* ------------------------------------------------------------------ */

const VinylVaultMultiversX = {
  isConnected()    { return Boolean(_mvrxState.account); },
  getAccount()     { return _mvrxState.account; },
  getNetworkName() {
    return MVRX_NETWORK === "mainnet" ? "MultiversX" : `MultiversX ${MVRX_NETWORK}`;
  },
  getShortAddress() {
    const a = _mvrxState.account;
    return a ? a.slice(0, 8) + "…" + a.slice(-4) : "";
  },
  isWalletAvailable: _isMvrxWalletAvailable,

  /**
   * Connect the user's MultiversX wallet (xPortal Web / DeFi extension).
   * @returns {Promise<{account: string, networkName: string}>}
   */
  async connectWallet() {
    const provider = _getMvrxProvider();
    if (!provider) {
      throw new Error(
        "No MultiversX wallet detected. " +
        "Please install the xPortal Web extension " +
        "(chromewebstore.google.com/detail/multiversx-defi-wallet)."
      );
    }

    await provider.init();
    await provider.login();

    const address = await provider.getAddress();
    if (!address) {
      throw new Error("MultiversX login failed or was rejected.");
    }

    _mvrxState.account = address;
    _mvrxState.wallet  = provider;

    _notifyMvrxAccountChange(_mvrxState.account);
    return { account: _mvrxState.account, networkName: this.getNetworkName() };
  },

  /** Clear local state and log out from the wallet. */
  disconnectWallet() {
    if (_mvrxState.wallet) {
      _mvrxState.wallet.logout().catch(() => {});
    }
    _mvrxState.account = null;
    _mvrxState.wallet  = null;
    _notifyMvrxAccountChange(null);
  },

  /**
   * Mint a vinyl-record certificate NFT on MultiversX via the deployed
   * VinylVault smart contract.
   *
   * Calls the `mintCertificate` endpoint with hex-encoded record attributes.
   *
   * @param {string} tokenId  Off-chain VinylVault token ID.
   * @param {object} metadata Record metadata { artist, title, year, catno, condition }.
   * @returns {Promise<{txHash: string, tokenId: string, explorerUrl: string}>}
   */
  async mintRecordNFT(tokenId, metadata) {
    if (!VINYLVAULT_MVRX_CONTRACT) {
      const err = new Error(
        "MultiversX contract is not configured. " +
        "Set VINYLVAULT_MVRX_CONTRACT in components/multiversx-service.js " +
        "after deploying with `mxpy contract deploy`."
      );
      err.code = "CONTRACT_NOT_CONFIGURED";
      throw err;
    }

    if (!this.isConnected()) {
      await this.connectWallet();
    }

    const apiUrl      = _MVRX_API_URLS[MVRX_NETWORK]      || _MVRX_API_URLS.devnet;
    const explorerBase = _MVRX_EXPLORER_URLS[MVRX_NETWORK] || _MVRX_EXPLORER_URLS.devnet;
    const chainID      = _MVRX_CHAIN_IDS[MVRX_NETWORK]    || "D";

    // Fetch current account nonce (prevents replay).
    const acctResp = await fetch(`${apiUrl}/accounts/${_mvrxState.account}`);
    if (!acctResp.ok) {
      throw new Error(`Failed to fetch account info: ${acctResp.statusText}`);
    }
    const acctData = await acctResp.json();
    const nonce = acctData.nonce ?? 0;

    // Build smart-contract call data:
    //   mintCertificate@<tokenId_hex>@<artist_hex>@<title_hex>@<year_hex>@<catno_hex>@<condition_hex>
    const hexArgs = [
      tokenId,
      metadata.artist    || "",
      metadata.title     || "",
      metadata.year      || "",
      metadata.catno     || "",
      metadata.condition || "",
    ].map(_toHex);
    const scData = "mintCertificate@" + hexArgs.join("@");

    // MultiversX transaction object.
    const tx = {
      nonce,
      value:    "0",
      receiver: VINYLVAULT_MVRX_CONTRACT,
      sender:   _mvrxState.account,
      gasPrice: 1000000000,
      gasLimit: 5000000,
      data:     btoa(scData), // base64-encoded for the protocol
      chainID,
      version:  1,
    };

    const signedTx = await _mvrxState.wallet.signTransaction(tx);

    const sendResp = await fetch(`${apiUrl}/transactions`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(signedTx),
    });
    if (!sendResp.ok) {
      const errData = await sendResp.json().catch(() => ({}));
      throw new Error(
        `Transaction broadcast failed: ${errData.error || sendResp.statusText}`
      );
    }

    const { txHash } = await sendResp.json();
    const explorerUrl = `${explorerBase}/transactions/${txHash}`;

    return { txHash, tokenId, explorerUrl };
  },

  onAccountChange(callback) {
    if (typeof callback === "function") {
      _mvrxListeners.accountChange.push(callback);
    }
  },

  // Expose helpers for UI use
  shortAddress: (a) => (a ? a.slice(0, 8) + "…" + a.slice(-4) : ""),
};

window.VinylVaultMultiversX = VinylVaultMultiversX;
