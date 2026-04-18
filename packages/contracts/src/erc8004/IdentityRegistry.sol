// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IdentityRegistry (ERC-8004 compatible)
 * @notice Enhanced version with owner-to-agent mapping for permanent persistence.
 */
contract IdentityRegistry {
    // --- Minimal ERC-721 state ---
    uint256 private _nextTokenId;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;

    // --- Persistence Mapping ---
    mapping(address => uint256) public ownerToAgentId;
    mapping(address => bool) public hasAgent;

    // --- ERC-8004 Identity state ---
    mapping(uint256 => address) private _agentWallets;
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    // --- Events ---
    event Registered(
        uint256 indexed agentId,
        string agentURI,
        address indexed owner
    );

    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );

    // --- Modifiers ---
    modifier onlyAgentOwner(uint256 agentId) {
        require(_owners[agentId] == msg.sender, "Not agent owner");
        _;
    }

    modifier agentExists(uint256 agentId) {
        require(_owners[agentId] != address(0), "Agent does not exist");
        _;
    }

    // --- Register ---

    function register(string calldata agentURI) external returns (uint256 agentId) {
        return _register(msg.sender, agentURI);
    }

    function _register(address owner, string memory agentURI) internal returns (uint256 agentId) {
        agentId = _nextTokenId++;
        _owners[agentId] = owner;
        _balances[owner]++;
        _tokenURIs[agentId] = agentURI;
        
        // Permanent mapping
        ownerToAgentId[owner] = agentId;
        hasAgent[owner] = true;
        
        emit Registered(agentId, agentURI, owner);
    }

    // --- READS ---

    function getAgentIdByOwner(address owner) external view returns (uint256 agentId, bool exists) {
        return (ownerToAgentId[owner], hasAgent[owner]);
    }

    function tokenURI(uint256 tokenId) external view agentExists(tokenId) returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _agentWallets[agentId];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "Zero address");
        return _balances[owner];
    }
}
