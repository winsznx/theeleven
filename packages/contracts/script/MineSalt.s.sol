// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PropMarketHook} from "../src/PropMarketHook.sol";

contract MineSalt is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint160 constant FLAG_MASK = 0x3FFF;
    uint16 constant DEFAULT_TARGET = 0x2A80;

    function run() external pure {
        bytes memory creationCode = abi.encodePacked(
            type(PropMarketHook).creationCode,
            abi.encode(
                IPoolManager(0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32),
                address(0x1111111111111111111111111111111111111111),
                address(0x2222222222222222222222222222222222222222),
                0x779Ded0c9e1022225f8E0630b35a9b54bE713736
            )
        );
        bytes32 initCodeHash = keccak256(creationCode);
        run(initCodeHash, DEFAULT_TARGET);
    }

    function run(bytes32 initCodeHash, uint16 targetMask) public pure {
        console.log("deployer:", CREATE2_DEPLOYER);
        console.log("initCodeHash:");
        console.logBytes32(initCodeHash);
        console.log("targetMask (low 14 bits):", targetMask);

        uint160 target = uint160(targetMask);
        if (target & FLAG_MASK != target) {
            revert("targetMask must fit in low 14 bits");
        }

        for (uint256 salt = 0; salt < 5_000_000; salt++) {
            address predicted = computeCreate2Address(salt, initCodeHash);
            if (uint160(predicted) & FLAG_MASK == target) {
                console.log("=== HookMiner PASS ===");
                console.log("salt:", salt);
                console.log("predicted address:", predicted);
                console.log("address & 0x3FFF:", uint160(predicted) & FLAG_MASK);
                return;
            }
        }
        revert("HookMiner: salt not found within deadline");
    }

    function computeCreate2Address(uint256 salt, bytes32 initCodeHash) internal pure returns (address) {
        return address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(bytes1(0xff), CREATE2_DEPLOYER, bytes32(salt), initCodeHash)
                    )
                )
            )
        );
    }
}
