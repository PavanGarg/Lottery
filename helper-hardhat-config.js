const networkConfig = {
  31337: {
    name: "hardhat",
    entranceFee: ethers.utils.parseEther("0.01"), // Example fee
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // Example gas lane
    subscriptionId: "0",
    callbackGasLimit: "500000", // Example gas limit for callback
    interval : "30", // Example interval in seconds
    blockConfirmations: 1,
  },
  11155111: {
    name: "sepolia",
    VRFCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.utils.parseEther("0.01"), // Example fee
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // Example gas lane
    subscriptionId: "352088",
    callbackGasLimit: "500000", // Example gas limit for callback
    interval : "30", // Example interval in seconds
    blockConfirmations: 1,
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
};
 