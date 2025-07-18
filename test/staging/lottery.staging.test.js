const { expect, assert } = require("chai");
const { ethers ,getNamedAccounts,deployments,network} = require("hardhat");
const { developmentChains,networkConfig } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)  ? describe.skip : describe("Lottery Unit Tests", () => {
    let Lottery, entranceFee, deployer;
    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        const lotteryDeployment = await deployments.get("Lottery");
        Lottery = await ethers.getContractAt("Lottery", lotteryDeployment.address);

        // const vrfDeployment = await deployments.get("VRFCoordinatorV2Mock");
        // VRFCoordinatorMock = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfDeployment.address);
        entranceFee = await Lottery.getEntranceFee();
    });
    describe("fulfillRandomWords", function () {
            it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
            // enter the raffle
            console.log("Setting up test...")
            const startingTimeStamp = await raffle.getLastTimestamp()
            const accounts = await ethers.getSigners()

            console.log("Setting up Listener...")
            await new Promise(async (resolve, reject) => {
            // setup listener before we enter the raffle
                // Just in case the blockchain moves REALLY fast
                raffle.once("WinnerSelected", async () => {
                    console.log("WinnerSelected event fired!")
                    try {
                        // add our asserts here
                        const recentWinner = await raffle.getRecentWinner()
                        const raffleState = await raffle.getRaffleState()
                        const winnerEndingBalance = await accounts[0].getBalance()
                        const endingTimeStamp = await raffle.getLastTimestamp()

                        await expect(raffle.getPlayer(0)).to.be.reverted
                        assert.equal(recentWinner.toString(), accounts[0].address)
                        assert.equal(raffleState, 0)
                        assert.equal(
                            winnerEndingBalance.toString(),
                            winnerStartingBalance.add(raffleEntranceFee).toString()
                        )
                        assert(endingTimeStamp > startingTimeStamp)
                        resolve()
                    } catch (error) {
                        console.log(error)
                        reject(error)
                    }
                })
                // Then entering the raffle
                console.log("Entering Raffle...")
                const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                await tx.wait(1)
                console.log("Ok, time to wait...")
                const winnerStartingBalance = await accounts[0].getBalance()

                // and this code WONT complete until our listener has finished listening!
            })
        })
    })
});