// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {PropMarketHookFactory} from "../src/PropMarketHookFactory.sol";

contract Deploy is Script {
    address constant POOL_MANAGER = 0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32;
    address constant USDT0 = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;

    string[11] internal AGENT_NAMES = [
        "Il Regista",
        "Il Trequartista",
        "Il Mediano",
        "Il Falso Nove",
        "Il Libero",
        "L'Ala",
        "Il Bomber",
        "Il Capitano",
        "Il Numero Dieci",
        "Il Catenaccio",
        "L'Ultimo"
    ];

    function run() external {
        require(block.chainid == 196, "wrong chain: expected X Layer 196");

        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address resolver = vm.envAddress("RESOLVER_ADDRESS");
        address[11] memory agents = _loadAgentAddrs();

        vm.startBroadcast(deployerPk);

        PropMarketHookFactory factory =
            new PropMarketHookFactory(IPoolManager(POOL_MANAGER), USDT0, resolver);

        for (uint8 i = 0; i < 11; i++) {
            factory.registerAgent(agents[i]);
        }

        vm.stopBroadcast();

        address deployer = vm.addr(deployerPk);
        require(factory.owner() == deployer, "owner mismatch");
        require(address(factory.poolManager()) == POOL_MANAGER, "poolManager mismatch");
        require(factory.usdt0() == USDT0, "usdt0 mismatch");
        require(factory.resolver() == resolver, "resolver mismatch");
        for (uint8 i = 0; i < 11; i++) {
            require(factory.registeredAgents(agents[i]), "agent not registered");
        }

        _writeArtifact(address(factory), deployer, resolver, agents);

        console.log("=== Regista 11 mainnet deployment ===");
        console.log("Factory:", address(factory));
        console.log("Block:  ", block.number);
    }

    function _loadAgentAddrs() internal view returns (address[11] memory a) {
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

    function _writeArtifact(
        address factory,
        address deployer,
        address resolver,
        address[11] memory agents
    ) internal {
        string memory agentsJson = "[\n";
        for (uint8 i = 0; i < 11; i++) {
            agentsJson = string.concat(
                agentsJson,
                '    { "index": ',
                vm.toString(uint256(i)),
                ', "name": "',
                AGENT_NAMES[i],
                '", "address": "',
                vm.toString(agents[i]),
                '" }',
                i < 10 ? ",\n" : "\n"
            );
        }
        agentsJson = string.concat(agentsJson, "  ]");

        string memory json = string.concat(
            "{\n",
            '  "chainId": 196,\n',
            '  "network": "xlayer-mainnet",\n',
            '  "deployedAt": "',
            vm.toString(block.timestamp),
            '",\n',
            '  "deployedAtBlock": ',
            vm.toString(block.number),
            ",\n",
            '  "deployer": "',
            vm.toString(deployer),
            '",\n',
            '  "resolver": "',
            vm.toString(resolver),
            '",\n',
            '  "contracts": { "PropMarketHookFactory": "',
            vm.toString(factory),
            '" },\n',
            '  "knownExternal": {\n',
            '    "poolManager": "',
            vm.toString(POOL_MANAGER),
            '",\n',
            '    "usdt0": "',
            vm.toString(USDT0),
            '"\n',
            "  },\n",
            '  "agents": ',
            agentsJson,
            "\n}\n"
        );

        vm.writeFile("deployments/xlayer-mainnet.json", json);
    }
}
