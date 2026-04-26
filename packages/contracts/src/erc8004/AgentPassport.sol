// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentPassport
 * @notice A verifiable on-chain identity document for Kite AI agents.
 * Integrates with ERC-8004 Identity and Reputation registries.
 */
interface IIdentityRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function hasAgent(address owner) external view returns (bool);
}

interface IReputationRegistry {
    function getSummary(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2) 
        external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);
}

contract AgentPassport {
    enum Tier { Scout, Trader, Verified, Elite }

    struct Passport {
        uint256 agentId;
        string did; // did:kite:0x...
        address agentWallet; // CDP MPC wallet
        uint8 capabilities; // bitmask: 1=MCP, 2=A2A, 4=AP2, 8=x402
        uint256 totalVolumeUsdc; // Total trade volume in 6 decimals
        Tier tier;
        uint256 lastUpdated;
    }

    IIdentityRegistry public identityRegistry;
    IReputationRegistry public reputationRegistry;
    address public admin;

    mapping(uint256 => Passport) public passports;
    mapping(uint256 => bool) public hasPassport;

    event PassportMinted(uint256 indexed agentId, string did, address agentWallet, Tier tier);
    event PassportUpdated(uint256 indexed agentId, uint256 totalVolumeUsdc, Tier tier);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address _identityRegistry, address _reputationRegistry) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        admin = msg.sender;
    }

    /**
     * @notice Mint a new Passport for an agent.
     */
    function mintPassport(
        uint256 agentId, 
        string calldata did, 
        address agentWallet, 
        uint8 capabilities
    ) external {
        // Ensure agent exists in IdentityRegistry
        require(identityRegistry.ownerOf(agentId) != address(0), "Agent does not exist");
        require(!hasPassport[agentId], "Passport already minted");

        passports[agentId] = Passport({
            agentId: agentId,
            did: did,
            agentWallet: agentWallet,
            capabilities: capabilities,
            totalVolumeUsdc: 0,
            tier: Tier.Scout,
            lastUpdated: block.timestamp
        });
        hasPassport[agentId] = true;

        emit PassportMinted(agentId, did, agentWallet, Tier.Scout);
    }

    /**
     * @notice Record a transaction to update volume and potentially upgrade tier.
     */
    function recordActivity(uint256 agentId, uint256 amountUsdc) external {
        require(hasPassport[agentId], "Passport not found");
        
        Passport storage p = passports[agentId];
        p.totalVolumeUsdc += amountUsdc;
        
        _refreshTier(agentId);
        p.lastUpdated = block.timestamp;
        
        emit PassportUpdated(agentId, p.totalVolumeUsdc, p.tier);
    }

    /**
     * @notice Re-evaluate tier based on volume and reputation.
     */
    function refreshPassport(uint256 agentId) external {
        require(hasPassport[agentId], "Passport not found");
        _refreshTier(agentId);
        passports[agentId].lastUpdated = block.timestamp;
    }

    function _refreshTier(uint256 agentId) internal {
        Passport storage p = passports[agentId];
        
        // Fetch reputation from ReputationRegistry
        (uint64 count, int128 summary, ) = reputationRegistry.getSummary(agentId, new address[](0), "", "");
        
        // Tier Logic:
        // Elite: > 1000 USDC volume AND > 4.5 reputation
        // Verified: > 100 USDC volume AND > 4.0 reputation
        // Trader: > 10 USDC volume
        // Scout: Default
        
        Tier newTier = Tier.Scout;
        
        // Reputation is in WAD (18 decimals), volume in 6 decimals (USDC)
        if (p.totalVolumeUsdc >= 1000 * 1e6 && summary >= 4.5 * 1e18) {
            newTier = Tier.Elite;
        } else if (p.totalVolumeUsdc >= 100 * 1e6 && summary >= 4.0 * 1e18) {
            newTier = Tier.Verified;
        } else if (p.totalVolumeUsdc >= 10 * 1e6) {
            newTier = Tier.Trader;
        }
        
        p.tier = newTier;
    }

    function getPassport(uint256 agentId) external view returns (Passport memory) {
        require(hasPassport[agentId], "Passport not found");
        return passports[agentId];
    }
}
