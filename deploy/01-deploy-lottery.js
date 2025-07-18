const { ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments}) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let VRFCoordinatorV2address,subscriptionId;
    let VRFCoordinatorV2Mock;

    if(developmentChains.includes(network.name)) {
        // console.log(ethers);
        const deployment = await deployments.get("VRFCoordinatorV2Mock");
        console.log("Using existing VRFCoordinatorV2Mock deployment:", deployment.address);
        VRFCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock",deployment.address);
        VRFCoordinatorV2address = VRFCoordinatorV2Mock.address;
        console.log("Local network detected! Using VRFCoordinatorV2Mock at address:", VRFCoordinatorV2address);
        // console.log(VRFCoordinatorV2Mock);
        const transactionResponse = await VRFCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        // console.log("Transaction Receipt Events:", transactionReceipt.events); // debug

        if (!transactionReceipt.events || transactionReceipt.events.length === 0) {
            throw new Error("No events found in the transaction receipt.");
        }
        subscriptionId = transactionReceipt.events[0].args.subId;
    }else{
        VRFCoordinatorV2address = networkConfig[chainId]["VRFCoordinatorV2"] || "";
        subscriptionId = networkConfig[chainId]["subscriptionId"] || "0";
    }
    const entranceFee = networkConfig[chainId]["entranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"] || "500000";
    const interval = networkConfig[chainId]["interval"] || "30";

    const args = [
        VRFCoordinatorV2address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval
    ];
    const lottery = await deploy("Lottery", {
        from: deployer,
        args: args, // constructor arguments if any
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (developmentChains.includes(network.name)) {
        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, ethers.utils.parseEther("1"));
        await VRFCoordinatorV2Mock.addConsumer(subscriptionId, lottery.address);
    }
    log("Lottery contract deployed!");
    if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying contract...");
        await verify(lottery.address, args);
    }
    log("__________________________________________________");

}
module.exports.tags = ["all", "lottery"];