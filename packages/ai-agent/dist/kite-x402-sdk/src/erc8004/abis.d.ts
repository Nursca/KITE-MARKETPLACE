/**
 * Minimal ERC-8004 ABIs for the buyer agent.
 * Subset of the full ABIs from packages/backend/src/erc8004/abis/
 */
export declare const IDENTITY_REGISTRY_ABI: readonly [{
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly internalType: "string";
        readonly name: "agentURI";
        readonly type: "string";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }];
    readonly name: "Registered";
    readonly type: "event";
}, {
    readonly inputs: readonly [{
        readonly internalType: "string";
        readonly name: "agentURI";
        readonly type: "string";
    }];
    readonly name: "register";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "tokenId";
        readonly type: "uint256";
    }];
    readonly name: "tokenURI";
    readonly outputs: readonly [{
        readonly internalType: "string";
        readonly name: "";
        readonly type: "string";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "tokenId";
        readonly type: "uint256";
    }];
    readonly name: "ownerOf";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }];
    readonly name: "getAgentWallet";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }];
    readonly name: "getAgentIdByOwner";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "bool";
        readonly name: "exists";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const REPUTATION_REGISTRY_ABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "int128";
        readonly name: "value";
        readonly type: "int128";
    }, {
        readonly internalType: "uint8";
        readonly name: "valueDecimals";
        readonly type: "uint8";
    }, {
        readonly internalType: "string";
        readonly name: "tag1";
        readonly type: "string";
    }, {
        readonly internalType: "string";
        readonly name: "tag2";
        readonly type: "string";
    }, {
        readonly internalType: "string";
        readonly name: "endpoint";
        readonly type: "string";
    }, {
        readonly internalType: "string";
        readonly name: "feedbackURI";
        readonly type: "string";
    }, {
        readonly internalType: "bytes32";
        readonly name: "feedbackHash";
        readonly type: "bytes32";
    }];
    readonly name: "giveFeedback";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "address[]";
        readonly name: "clientAddresses";
        readonly type: "address[]";
    }, {
        readonly internalType: "string";
        readonly name: "tag1";
        readonly type: "string";
    }, {
        readonly internalType: "string";
        readonly name: "tag2";
        readonly type: "string";
    }];
    readonly name: "getSummary";
    readonly outputs: readonly [{
        readonly internalType: "uint64";
        readonly name: "count";
        readonly type: "uint64";
    }, {
        readonly internalType: "int128";
        readonly name: "summaryValue";
        readonly type: "int128";
    }, {
        readonly internalType: "uint8";
        readonly name: "summaryValueDecimals";
        readonly type: "uint8";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }];
    readonly name: "getClients";
    readonly outputs: readonly [{
        readonly internalType: "address[]";
        readonly name: "";
        readonly type: "address[]";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "address[]";
        readonly name: "clientAddresses";
        readonly type: "address[]";
    }, {
        readonly internalType: "string";
        readonly name: "tag1";
        readonly type: "string";
    }, {
        readonly internalType: "string";
        readonly name: "tag2";
        readonly type: "string";
    }, {
        readonly internalType: "bool";
        readonly name: "includeRevoked";
        readonly type: "bool";
    }];
    readonly name: "readAllFeedback";
    readonly outputs: readonly [{
        readonly internalType: "address[]";
        readonly name: "clients";
        readonly type: "address[]";
    }, {
        readonly internalType: "uint64[]";
        readonly name: "feedbackIndexes";
        readonly type: "uint64[]";
    }, {
        readonly internalType: "int128[]";
        readonly name: "values";
        readonly type: "int128[]";
    }, {
        readonly internalType: "uint8[]";
        readonly name: "valueDecimals";
        readonly type: "uint8[]";
    }, {
        readonly internalType: "string[]";
        readonly name: "tag1s";
        readonly type: "string[]";
    }, {
        readonly internalType: "string[]";
        readonly name: "tag2s";
        readonly type: "string[]";
    }, {
        readonly internalType: "bool[]";
        readonly name: "revokedStatuses";
        readonly type: "bool[]";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const VALIDATION_REGISTRY_ABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "address[]";
        readonly name: "validatorAddresses";
        readonly type: "address[]";
    }, {
        readonly internalType: "string";
        readonly name: "tag";
        readonly type: "string";
    }];
    readonly name: "getSummary";
    readonly outputs: readonly [{
        readonly internalType: "uint64";
        readonly name: "count";
        readonly type: "uint64";
    }, {
        readonly internalType: "uint8";
        readonly name: "avgResponse";
        readonly type: "uint8";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }];
    readonly name: "getAgentValidations";
    readonly outputs: readonly [{
        readonly internalType: "bytes32[]";
        readonly name: "";
        readonly type: "bytes32[]";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "requestHash";
        readonly type: "bytes32";
    }];
    readonly name: "getValidationStatus";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "validatorAddress";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint8";
        readonly name: "response";
        readonly type: "uint8";
    }, {
        readonly internalType: "bytes32";
        readonly name: "responseHash";
        readonly type: "bytes32";
    }, {
        readonly internalType: "string";
        readonly name: "tag";
        readonly type: "string";
    }, {
        readonly internalType: "uint256";
        readonly name: "lastUpdate";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const AGENT_PASSPORT_ABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "string";
        readonly name: "did";
        readonly type: "string";
    }, {
        readonly internalType: "address";
        readonly name: "agentWallet";
        readonly type: "address";
    }, {
        readonly internalType: "uint8";
        readonly name: "capabilities";
        readonly type: "uint8";
    }];
    readonly name: "mintPassport";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "amountUsdc";
        readonly type: "uint256";
    }];
    readonly name: "recordActivity";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }];
    readonly name: "getPassport";
    readonly outputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "uint256";
            readonly name: "agentId";
            readonly type: "uint256";
        }, {
            readonly internalType: "string";
            readonly name: "did";
            readonly type: "string";
        }, {
            readonly internalType: "address";
            readonly name: "agentWallet";
            readonly type: "address";
        }, {
            readonly internalType: "uint8";
            readonly name: "capabilities";
            readonly type: "uint8";
        }, {
            readonly internalType: "uint256";
            readonly name: "totalVolumeUsdc";
            readonly type: "uint256";
        }, {
            readonly internalType: "enum AgentPassport.Tier";
            readonly name: "tier";
            readonly type: "uint8";
        }, {
            readonly internalType: "uint256";
            readonly name: "lastUpdated";
            readonly type: "uint256";
        }];
        readonly internalType: "struct AgentPassport.Passport";
        readonly name: "";
        readonly type: "tuple";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly name: "hasPassport";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
