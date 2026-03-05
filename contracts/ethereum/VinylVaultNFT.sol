// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VinylVaultNFT
 * @notice ERC-721 certificate contract for vinyl record authenticity on Ethereum / Polygon.
 *
 * Each token represents a 1-of-1 certificate tied to a specific vinyl record.
 * Certificates are soul-bound by default (transfers disabled) so that a certificate
 * cannot be detached from the wallet that created it.  The contract owner can
 * override this at deploy time by setting `transferable = true`.
 *
 * ABI used by web3-service.js:
 *   safeMint(address to, string uri)   — standard OpenZeppelin-compatible signature
 *
 * Deployment (Hardhat / Foundry):
 *   npx hardhat run scripts/deploy.js --network polygon_amoy
 *
 * After deployment, set the contract address in:
 *   components/web3-service.js  →  VINYLVAULT_CONTRACT_ADDRESS
 *
 * Dependencies (install before compiling):
 *   npm install @openzeppelin/contracts
 */

/// @dev Minimal ERC-165 introspection interface.
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/// @dev Minimal ERC-721 interface required by web3-service.js.
interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/// @dev Minimal ERC-721 Metadata extension.
interface IERC721Metadata is IERC721 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

/**
 * @title VinylVaultNFT
 *
 * Minimal, self-contained ERC-721 implementation with:
 * - safeMint  — matches the ABI expected by components/web3-service.js
 * - revoke    — burn by original minter or current owner
 * - Soul-bound enforcement (configurable at deploy time)
 *
 * This implementation has no external dependencies so it can be deployed
 * without an npm install.  If you prefer OpenZeppelin, the interface is
 * compatible with ERC721URIStorage.
 */
contract VinylVaultNFT is IERC721Metadata {
    /* -------------------------------------------------------------- */
    /*  Storage                                                         */
    /* -------------------------------------------------------------- */

    string private constant _NAME   = "VinylVault Certificate";
    string private constant _SYMBOL = "VVNFT";

    /// Whether tokens can be transferred between wallets after minting.
    /// When false the contract is "soul-bound": only mint and burn are allowed.
    bool public immutable transferable;

    /// Contract owner (set to deployer). Note: `transferable` is fixed at deployment.
    address public owner;

    /// Auto-incrementing token counter (uint256 — overflow not reachable in practice).
    uint256 private _nextTokenId;

    /// token ID → owner
    mapping(uint256 => address) private _owners;
    /// owner  → balance
    mapping(address => uint256) private _balances;
    /// token ID → approved address
    mapping(uint256 => address) private _tokenApprovals;
    /// owner → operator → approved
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    /// token ID → token URI
    mapping(uint256 => string) private _tokenURIs;
    /// token ID → original minter (for revoke permission)
    mapping(uint256 => address) public originalMinter;

    /* -------------------------------------------------------------- */
    /*  Events                                                          */
    /* -------------------------------------------------------------- */

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /// Emitted when a new certificate is minted.
    event CertificateMinted(
        address indexed minter,
        uint256 indexed tokenId,
        string  uri
    );

    /// Emitted when a certificate is revoked (burned).
    event CertificateRevoked(address indexed revoker, uint256 indexed tokenId);

    /* -------------------------------------------------------------- */
    /*  Constructor                                                     */
    /* -------------------------------------------------------------- */

    /**
     * @param _transferable  Pass `false` for soul-bound certificates (recommended).
     *                       Pass `true` to allow wallet-to-wallet transfers.
     */
    constructor(bool _transferable) {
        transferable = _transferable;
        owner = msg.sender;
        _nextTokenId = 1;
    }

    /* -------------------------------------------------------------- */
    /*  ERC-721 Metadata                                                */
    /* -------------------------------------------------------------- */

    function name()   external pure override returns (string memory) { return _NAME;   }
    function symbol() external pure override returns (string memory) { return _SYMBOL; }

    function tokenURI(uint256 tokenId) external view override returns (string memory) {
        require(_owners[tokenId] != address(0), "VinylVault: nonexistent token");
        return _tokenURIs[tokenId];
    }

    /* -------------------------------------------------------------- */
    /*  ERC-721 Core                                                    */
    /* -------------------------------------------------------------- */

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC721).interfaceId
            || interfaceId == type(IERC721Metadata).interfaceId
            || interfaceId == type(IERC165).interfaceId;
    }

    function balanceOf(address _owner) external view override returns (uint256) {
        require(_owner != address(0), "VinylVault: zero address");
        return _balances[_owner];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "VinylVault: nonexistent token");
        return tokenOwner;
    }

    function approve(address to, uint256 tokenId) external override {
        address tokenOwner = ownerOf(tokenId);
        require(to != tokenOwner, "VinylVault: approve to current owner");
        require(
            msg.sender == tokenOwner || isApprovedForAll(tokenOwner, msg.sender),
            "VinylVault: not owner nor approved for all"
        );
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_owners[tokenId] != address(0), "VinylVault: nonexistent token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external override {
        require(operator != msg.sender, "VinylVault: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address _owner, address operator) public view override returns (bool) {
        return _operatorApprovals[_owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        _requireTransferAllowed(from, to);
        require(_isApprovedOrOwner(msg.sender, tokenId), "VinylVault: not approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) public override {
        transferFrom(from, to, tokenId);
        require(
            to.code.length == 0 || _checkOnERC721Received(from, to, tokenId, data),
            "VinylVault: transfer to non ERC721Receiver"
        );
    }

    /* -------------------------------------------------------------- */
    /*  Mint / Revoke                                                   */
    /* -------------------------------------------------------------- */

    /**
     * @notice Mint a new vinyl record certificate.
     *
     * Function signature is intentionally compatible with the ABI in
     * components/web3-service.js (`safeMint(address,string)`).
     *
     * Minting to a different address is blocked: the `to` parameter must equal
     * `msg.sender`.  This prevents a caller from forcing certificates into other
     * wallets without consent and ensures the original minter and token owner are
     * always the same person at mint time.
     *
     * @param to            Recipient address — must equal msg.sender.
     * @param uri           JSON metadata URI (data URI or IPFS/Arweave URL).
     * @return newTokenId   The minted ERC-721 token ID.
     */
    function safeMint(address to, string memory uri) external returns (uint256 newTokenId) {
        require(to == msg.sender, "VinylVault: may only mint to your own address");
        newTokenId = _nextTokenId++;
        _mint(to, newTokenId);
        _tokenURIs[newTokenId] = uri;
        originalMinter[newTokenId] = to;
        emit CertificateMinted(to, newTokenId, uri);
    }

    /**
     * @notice Revoke (burn) a certificate.
     *         Only the current token owner or the original minter may call this.
     *
     * @param tokenId  The ERC-721 token ID to burn.
     */
    function revoke(uint256 tokenId) external {
        require(
            ownerOf(tokenId) == msg.sender || originalMinter[tokenId] == msg.sender,
            "VinylVault: not authorised to revoke"
        );
        emit CertificateRevoked(msg.sender, tokenId);
        _burn(tokenId);
    }

    /* -------------------------------------------------------------- */
    /*  Internal helpers                                                */
    /* -------------------------------------------------------------- */

    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "VinylVault: mint to zero address");
        require(_owners[tokenId] == address(0), "VinylVault: already minted");
        _balances[to]++;
        _owners[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }

    function _burn(uint256 tokenId) internal {
        address tokenOwner = ownerOf(tokenId);
        delete _tokenApprovals[tokenId];
        _balances[tokenOwner]--;
        delete _owners[tokenId];
        delete _tokenURIs[tokenId];
        delete originalMinter[tokenId];
        emit Transfer(tokenOwner, address(0), tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "VinylVault: transfer from incorrect owner");
        require(to != address(0), "VinylVault: transfer to zero address");
        delete _tokenApprovals[tokenId];
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return spender == tokenOwner
            || getApproved(tokenId) == spender
            || isApprovedForAll(tokenOwner, spender);
    }

    /// @dev Reverts if the transfer is peer-to-peer and the contract is soul-bound.
    function _requireTransferAllowed(address from, address to) internal view {
        if (!transferable && from != address(0) && to != address(0)) {
            revert("VinylVault: certificates are soul-bound and cannot be transferred");
        }
    }

    /// @dev Minimal ERC721Received check.
    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal returns (bool) {
        bytes4 retval = abi.decode(
            _call(to, abi.encodeWithSelector(
                bytes4(keccak256("onERC721Received(address,address,uint256,bytes)")),
                msg.sender, from, tokenId, data
            )),
            (bytes4)
        );
        return retval == bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

    function _call(address target, bytes memory data) internal returns (bytes memory result) {
        bool success;
        (success, result) = target.call(data);
        require(success, "VinylVault: call failed");
    }
}
