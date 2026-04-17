// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IdentityRegistry} from "../src/erc8004/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/erc8004/ReputationRegistry.sol";
import {ValidationRegistry} from "../src/erc8004/ValidationRegistry.sol";

contract DeployERC8004 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy IdentityRegistry
        IdentityRegistry identity = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identity));

        // 2. Deploy ReputationRegistry
        ReputationRegistry reputation = new ReputationRegistry(address(identity));
        console.log("ReputationRegistry deployed at:", address(reputation));

        // 3. Deploy ValidationRegistry
        ValidationRegistry validation = new ValidationRegistry(address(identity));
        console.log("ValidationRegistry deployed at:", address(validation));

        vm.stopBroadcast();
    }
}
