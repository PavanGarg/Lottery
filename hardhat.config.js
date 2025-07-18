require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("@nomiclabs/hardhat-ethers")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY || "";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  defaultNetwork: "hardhat",
  networks :{
    hardhat:{
      chainId: 31337,
      blockconfirmations: 1,
    },
    sepolia: {
      chainId: 11155111,
      blockConfirmations: 1,
      url: SEPOLIA_RPC_URL,
      accounts: [SEPOLIA_PRIVATE_KEY],
    },
  },
  etherscan:{
    apiKey: {
      sepolia: ETHERSCAN_API_KEY
    }
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    outputFile : "gas-report.txt",
    noColors: true,
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
    player: {
      default: 1, // second account will be the player
    }, 
  },
};
