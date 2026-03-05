/**
 * VinylVault Bitcoin Service
 *
 * Handles Unisat / Xverse wallet connection and Bitcoin Ordinals inscriptions
 * for vinyl record authenticity certificates.
 *
 * Bitcoin does not have a traditional smart-contract runtime.  Authenticity
 * certificates are instead stored as JSON Ordinals inscriptions permanently
 * embedded in the Bitcoin blockchain.
 *
 * Dependencies: Unisat (window.unisat) or Xverse (window.XverseProviders)
 *               browser extension.
 *
 * Usage:
 *   const info = await VinylVaultBitcoin.connectWallet();
 *   const result = await VinylVaultBitcoin.mintRecordNFT(tokenId, metadata);
 *
 * ⚠️  Ordinals inscriptions are permanent and require on-chain BTC fees.
 *     Production deployments should verify fee-rate via mempool.space API.
 */

/* ------------------------------------------------------------------ */
/*  Internal state                                                      */
/* ------------------------------------------------------------------ */

const _btcState = {
  account: null,
  walletType: null, // "unisat" | "xverse"
};

const _btcListeners = { accountChange: [] };

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function _notifyBtcAccountChange(account) {
  _btcListeners.accountChange.forEach((cb) => {
    try { cb(account); } catch (_e) { /* ignore */ }
  });
}

function _isBitcoinWalletAvailable() {
  return (
    typeof window !== "undefined" &&
    (Boolean(window.unisat) || Boolean(window.XverseProviders?.BitcoinProvider))
  );
}

/* ------------------------------------------------------------------ */
/*  Public API — VinylVaultBitcoin                                      */
/* ------------------------------------------------------------------ */

const VinylVaultBitcoin = {
  isConnected()    { return Boolean(_btcState.account); },
  getAccount()     { return _btcState.account; },
  getNetworkName() { return "Bitcoin (Ordinals)"; },
  getShortAddress() {
    const a = _btcState.account;
    return a ? a.slice(0, 6) + "…" + a.slice(-4) : "";
  },
  isWalletAvailable: _isBitcoinWalletAvailable,

  /**
   * Connect the user's Bitcoin wallet (Unisat or Xverse).
   * @returns {Promise<{account: string, networkName: string}>}
   */
  async connectWallet() {
    if (!_isBitcoinWalletAvailable()) {
      throw new Error(
        "No Bitcoin wallet detected. " +
        "Please install Unisat (unisat.io) or Xverse (xverse.app)."
      );
    }

    let accounts;
    if (window.unisat) {
      accounts = await window.unisat.requestAccounts();
      _btcState.walletType = "unisat";

      window.unisat.on("accountsChanged", (accs) => {
        _btcState.account = accs.length > 0 ? accs[0] : null;
        _notifyBtcAccountChange(_btcState.account);
      });
    } else {
      // Xverse connection
      const response = await window.XverseProviders.BitcoinProvider.connect({
        purposes: ["ordinals", "payment"],
      });
      accounts = (response.addresses || []).map((a) => a.address);
      _btcState.walletType = "xverse";
    }

    if (!accounts || accounts.length === 0) {
      throw new Error(
        "No Bitcoin accounts returned. Did you reject the wallet connection?"
      );
    }

    _btcState.account = accounts[0];
    _notifyBtcAccountChange(_btcState.account);
    return { account: _btcState.account, networkName: this.getNetworkName() };
  },

  /** Clear local state. */
  disconnectWallet() {
    _btcState.account = null;
    _btcState.walletType = null;
    _notifyBtcAccountChange(null);
  },

  /**
   * Inscribe a vinyl-record certificate as a Bitcoin Ordinal.
   *
   * Creates a JSON inscription containing the record metadata and requests
   * the user's wallet to sign and broadcast the inscription transaction.
   *
   * Unisat wallets support `window.unisat.inscribeContent()` for a
   * streamlined flow.  Xverse and other wallets fall back to a signed
   * message proof-of-intent (note: not a full on-chain inscription).
   *
   * @param {string} tokenId  Off-chain VinylVault token ID.
   * @param {object} metadata Record metadata { artist, title, year, catno, condition }.
   * @returns {Promise<{txHash: string, tokenId: string, explorerUrl: string}>}
   */
  async mintRecordNFT(tokenId, metadata) {
    if (!this.isConnected()) {
      await this.connectWallet();
    }

    const inscriptionPayload = {
      p: "vinylvault-cert",
      op: "mint",
      token_id: tokenId,
      artist:    metadata.artist    || "",
      title:     metadata.title     || "",
      year:      metadata.year      || "",
      catno:     metadata.catno     || "",
      condition: metadata.condition || "",
      ts: new Date().toISOString(),
    };
    const contentJson = JSON.stringify(inscriptionPayload);

    if (_btcState.walletType === "unisat" && window.unisat.inscribeContent) {
      // Unisat native inscription API
      const txid = await window.unisat.inscribeContent({
        content: contentJson,
        contentType: "application/json",
        // Fee rate in sats/vByte.  Adjust based on current network conditions.
        // Recommended: fetch live rates from https://mempool.space/api/v1/fees/recommended
        // and use the "halfHourFee" or "fastestFee" field.
        feeRate: 10,
      });
      const explorerUrl = `https://ordinals.com/inscription/${txid}i0`;
      return { txHash: txid, tokenId, explorerUrl };
    }

    // Fallback: sign the JSON payload as a message (proof of intent).
    // This is NOT an on-chain inscription but provides a cryptographic
    // record tied to the user's Bitcoin address.
    const message = `VinylVault Certificate\n${contentJson}`;
    let signature;
    if (_btcState.walletType === "unisat") {
      signature = await window.unisat.signMessage(message);
    } else if (window.XverseProviders?.BitcoinProvider) {
      const resp = await window.XverseProviders.BitcoinProvider.signMessage({
        address: _btcState.account,
        message,
      });
      signature = resp.signature || String(resp);
    } else {
      throw new Error("Unable to sign message: unsupported wallet type.");
    }

    return {
      txHash: signature,
      tokenId,
      explorerUrl: "",
      // Not a true on-chain inscription — the UI will persist this as a local
      // (off-chain) certificate rather than "On-Chain ⛓️".
      onChain: false,
      note: "Signed locally — use a Unisat wallet with inscription support for full on-chain recording.",
    };
  },

  onAccountChange(callback) {
    if (typeof callback === "function") {
      _btcListeners.accountChange.push(callback);
    }
  },

  // Expose helpers for UI use
  shortAddress: (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : ""),
};

window.VinylVaultBitcoin = VinylVaultBitcoin;
