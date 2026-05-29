// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

contract PreDeployCheck is Script {
    address constant POOL_MANAGER = 0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32;
    address constant USDT0 = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;
    uint256 constant MIN_DEPLOYER_BAL_WEI = 0.05 ether;

    function run() external view {
        bool ok = true;

        if (block.chainid != 196) {
            console.log("FAIL chainid: expected 196, got", block.chainid);
            ok = false;
        } else {
            console.log("OK   chainid: 196 (X Layer)");
        }

        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        uint256 bal = deployer.balance;
        if (bal < MIN_DEPLOYER_BAL_WEI) {
            console.log("FAIL deployer balance: addr", deployer);
            console.log("     have wei:", bal);
            console.log("     need wei:", MIN_DEPLOYER_BAL_WEI);
            ok = false;
        } else {
            console.log("OK   deployer:", deployer);
            console.log("     balance wei:", bal);
        }

        if (USDT0.code.length == 0) {
            console.log("FAIL USDT0 has no code at", USDT0);
            ok = false;
        } else {
            console.log("OK   USDT0 is contract");
        }
        if (POOL_MANAGER.code.length == 0) {
            console.log("FAIL PoolManager has no code at", POOL_MANAGER);
            ok = false;
        } else {
            console.log("OK   PoolManager is contract");
        }

        address resolver = vm.envAddress("RESOLVER_ADDRESS");
        if (resolver == address(0)) {
            console.log("FAIL RESOLVER_ADDRESS unset/zero");
            ok = false;
        } else {
            console.log("OK   resolver:", resolver);
        }

        address[11] memory agents = _loadAgents();
        for (uint8 i = 0; i < 11; i++) {
            if (agents[i] == address(0)) {
                console.log("FAIL agent index has zero address:", i);
                ok = false;
            }
            for (uint8 j = uint8(i) + 1; j < 11; j++) {
                if (agents[i] == agents[j]) {
                    console.log("FAIL duplicate agent address; collision indices:", i, j);
                    ok = false;
                }
            }
        }
        if (ok) {
            console.log("OK   11 agents all set, non-zero, distinct");
        }

        if (!ok) revert("preflight failed");
        console.log("--- PREFLIGHT PASS ---");
    }

    function _loadAgents() internal view returns (address[11] memory a) {
        a[0] = vm.envAddress("AGENT_0_ADDR");
        a[1] = vm.envAddress("AGENT_1_ADDR");
        a[2] = vm.envAddress("AGENT_2_ADDR");
        a[3] = vm.envAddress("AGENT_3_ADDR");
        a[4] = vm.envAddress("AGENT_4_ADDR");
        a[5] = vm.envAddress("AGENT_5_ADDR");
        a[6] = vm.envAddress("AGENT_6_ADDR");
        a[7] = vm.envAddress("AGENT_7_ADDR");
        a[8] = vm.envAddress("AGENT_8_ADDR");
        a[9] = vm.envAddress("AGENT_9_ADDR");
        a[10] = vm.envAddress("AGENT_10_ADDR");
    }
}
