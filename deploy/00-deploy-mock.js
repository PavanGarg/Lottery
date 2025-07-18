const { ethers } = require("hardhat");
const {developmentChains,networkConfig} = require("../helper-hardhat-config");

const BASE_FEE = ethers.utils.parseEther("0.25"); // 0.25 LINK per request
const GAS_PRICE_LINK = 1e9; // 1000000000 LINK per gas

module.exports = async ({getNamedAccounts,deployments}) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            contract : "VRFCoordinatorV2Mock",
            from: deployer,
            args: [BASE_FEE, GAS_PRICE_LINK], // constructor arguments
            log: true,
        });
        log("Mocks Deployed!");
        log("You are deploying to a local network, you'll need a local network running to interact");
        log("_______________________________________________________________");
    }

}
module.exports.tags = ["all", "mocks"];