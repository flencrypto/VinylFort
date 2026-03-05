#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// VinylVault Certificate — MultiversX ESDT NFT smart contract.
///
/// Manages a single ESDT NFT collection where each token represents a
/// vinyl-record authenticity certificate.
///
/// ## Deployment
///
/// ```sh
/// mxpy contract build
/// mxpy contract deploy \
///   --bytecode output/vinylvault_certificate.wasm \
///   --pem ~/wallet.pem \
///   --gas-limit 60000000 \
///   --network devnet
/// ```
///
/// After deployment:
/// 1. Call `registerCollection` (payable with 0.05 EGLD issuance cost) once.
/// 2. Set the contract address in `components/multiversx-service.js`
///    → `VINYLVAULT_MVRX_CONTRACT`.
#[multiversx_sc::contract]
pub trait VinylVaultCertificate {
    /* -------------------------------------------------------------- */
    /*  Init                                                            */
    /* -------------------------------------------------------------- */

    #[init]
    fn init(&self) {}

    #[upgrade]
    fn upgrade(&self) {}

    /* -------------------------------------------------------------- */
    /*  Collection registration (owner-only, called once after deploy)  */
    /* -------------------------------------------------------------- */

    /// Register the ESDT NFT collection with the MultiversX protocol.
    ///
    /// Must be called once by the contract owner with exactly 0.05 EGLD
    /// (the protocol-level issuance fee).  On success the token identifier
    /// is stored and certificate minting becomes available.
    #[payable("EGLD")]
    #[endpoint(registerCollection)]
    fn register_collection(
        &self,
        token_name: ManagedBuffer,
        token_ticker: ManagedBuffer,
    ) {
        require!(
            self.blockchain().get_caller() == self.blockchain().get_owner_address(),
            "Only the contract owner may register the collection"
        );
        require!(
            self.nft_token_id().is_empty(),
            "Collection already registered"
        );

        let issue_cost = self.call_value().egld_value().clone_value();
        self.send()
            .esdt_system_sc_proxy()
            .register_and_set_all_roles(
                issue_cost,
                token_name,
                token_ticker,
                EsdtTokenType::NonFungible,
                0usize,
            )
            .with_callback(self.callbacks().collection_registered_cb())
            .call_and_exit();
    }

    #[callback]
    fn collection_registered_cb(
        &self,
        #[call_result] result: ManagedAsyncCallResult<TokenIdentifier>,
    ) {
        match result {
            ManagedAsyncCallResult::Ok(token_id) => {
                self.nft_token_id().set(&token_id);
            }
            ManagedAsyncCallResult::Err(_) => {
                // Registration failed; the owner must call registerCollection again.
            }
        }
    }

    /* -------------------------------------------------------------- */
    /*  Certificate minting                                             */
    /* -------------------------------------------------------------- */

    /// Mint a vinyl-record certificate NFT and transfer it to the caller.
    ///
    /// Arguments are hex-encoded in the transaction `data` field:
    /// ```
    /// mintCertificate@<token_id_hex>@<artist_hex>@<title_hex>@<year_hex>@<catno_hex>@<condition_hex>
    /// ```
    ///
    /// This function is called from `components/multiversx-service.js`.
    #[endpoint(mintCertificate)]
    fn mint_certificate(
        &self,
        token_id: ManagedBuffer,
        artist: ManagedBuffer,
        title: ManagedBuffer,
        year: ManagedBuffer,
        catno: ManagedBuffer,
        condition: ManagedBuffer,
    ) {
        require!(!self.nft_token_id().is_empty(), "Collection not registered yet");

        let caller = self.blockchain().get_caller();
        let nft_token = self.nft_token_id().get();

        // Build a human-readable attributes string stored on-chain.
        let mut attrs = ManagedBuffer::new();
        attrs.append(&ManagedBuffer::from(b"token_id:"));
        attrs.append(&token_id);
        attrs.append(&ManagedBuffer::from(b";artist:"));
        attrs.append(&artist);
        attrs.append(&ManagedBuffer::from(b";title:"));
        attrs.append(&title);
        attrs.append(&ManagedBuffer::from(b";year:"));
        attrs.append(&year);
        attrs.append(&ManagedBuffer::from(b";catno:"));
        attrs.append(&catno);
        attrs.append(&ManagedBuffer::from(b";condition:"));
        attrs.append(&condition);

        let nft_nonce = self.send().esdt_nft_create(
            &nft_token,
            &BigUint::from(1u64),
            &ManagedBuffer::from(b"VinylVault Certificate"),
            &BigUint::zero(),    // royalties (none)
            &ManagedBuffer::new(), // content hash (omitted)
            &attrs,
            &ManagedVec::new(),  // URIs (none required; metadata is on-chain)
        );

        // Transfer the freshly minted NFT directly to the caller.
        self.send().direct_esdt(
            &caller,
            &nft_token,
            nft_nonce,
            &BigUint::from(1u64),
        );
    }

    /* -------------------------------------------------------------- */
    /*  Storage                                                         */
    /* -------------------------------------------------------------- */

    /// The ESDT token identifier for the certificate collection.
    /// Populated once `registerCollection` succeeds.
    #[storage_mapper("nftTokenId")]
    fn nft_token_id(&self) -> SingleValueMapper<TokenIdentifier>;
}
