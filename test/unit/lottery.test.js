
const { expect, assert } = require("chai");
const { ethers ,getNamedAccounts,deployments,network} = require("hardhat");
const { developmentChains,networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name) ? describe.skip : describe("Lottery Unit Tests", function () {
    let Lottery, VRFCoordinatorMock, entranceFee, deployer,interval;
    const chainId = network.config.chainId;
    beforeEach(async () => {
         deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["mocks", "lottery"]);

        const lotteryDeployment = await deployments.get("Lottery");
        Lottery = await ethers.getContractAt("Lottery", lotteryDeployment.address);

        const vrfDeployment = await deployments.get("VRFCoordinatorV2Mock");
        VRFCoordinatorMock = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfDeployment.address);
        entranceFee = await Lottery.getEntranceFee();
        interval = await Lottery.getInterval();
    });

    describe("constructor",  () => {
        it("initializes the lottery correctly", async function () {
            const lotteryState = await Lottery.getLotteryState();
            const interval = await Lottery.getInterval();
            expect(lotteryState.toString()).to.equal("0");
            expect(interval.toString()).to.equal(networkConfig[chainId]["interval"]);
        });
    });

    describe("enterLottery", () => {
        // it("reverts when not enough ETH is sent", async function () {
        //     await expect(Lottery.enterlottery()).to.be.revertedWith("Lottery__NotEnoughETH");
        // });

        it("records player when they enter", async function () {
            await Lottery.enterlottery({ value: entranceFee });
            const playerFromContract = await Lottery.getPlayers();
            expect(playerFromContract[0]).to.equal(deployer);
        });

        it("emits event on enter", async function () {
            await expect(Lottery.enterlottery({ value: entranceFee }))
                .to.emit(Lottery, "LotteryEntered")
                .withArgs(deployer);
        });

        it("does not allow entrance when lottery is calculating", async function () {
            await Lottery.enterlottery({ value: entranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
            await Lottery.performUpkeep([]);
            await expect(Lottery.enterlottery({ value: entranceFee })).to.be.revertedWith(
                "Lottery__NotOpen"
            );
        });
    });

    describe("checkUpkeep", () => {
        it("returns false if no ETH has been sent", async function () {
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
            const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep([]);
            expect(upkeepNeeded).to.be.false;
        });

        it("returns false if lottery is not open", async function () {
            await Lottery.enterlottery({ value: entranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
            await Lottery.performUpkeep([]);
            const lotteryState = await Lottery.getLotteryState();
            const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep([]);
            expect(lotteryState.toString()).to.equal("2"); // 2 means calculating
            expect(upkeepNeeded).to.be.false;
        });
        it("returns false if not enough time has passed", async function () {
            await Lottery.enterlottery({ value: entranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]);
            await network.provider.send("evm_mine", []);
            const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.false;
        });
        it("returns true if enough time has passed, players have joined, and lottery is open", async function () {
            await Lottery.enterlottery({ value: entranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
            const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.true;
        });
    });
    describe("performUpkeep", () => {
        it("can only run if checkUpkeep is true", async function () {
            await Lottery.enterlottery({ value: entranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
            const tx = await Lottery.performUpkeep([]);
            assert(tx);
        });

        it("reverts if checkUpkeep is false", async function () {
            await expect(Lottery.performUpkeep([])).to.be.revertedWith(
                "Lottery__UpkeepNotNeeded"
            );
        });

        it("updates the lottery state, emits an event, and calls the VRF coordinator", async function () {
            await Lottery.enterlottery({ value: entranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
            const txResponse = await Lottery.performUpkeep([]);
            const txReceipt = await txResponse.wait(1);
            const requestId = txReceipt.events[1].args.requestId;
            const lotteryState = await Lottery.getLotteryState();
            expect(requestId.toNumber()).to.be.greaterThan(0);
            expect(lotteryState.toString()).to.equal("2"); // 2 means calculating
        });
    });
    describe("fulfillRandomWords", () => {
        beforeEach(async () => {
            await Lottery.enterlottery({ value: entranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
        });

        it("can only be called after performUpkeep", async function () {
            await expect(
                VRFCoordinatorMock.fulfillRandomWords(0, Lottery.address)
            ).to.be.revertedWith("nonexistent request");
            await expect(
                VRFCoordinatorMock.fulfillRandomWords(1, Lottery.address)
            ).to.be.revertedWith("nonexistent request");
        });

        it("picks a winner, resets the lottery, and sends money", async function () {
            const additionalEntrants = 3;
            const startingIndex = 2;
            let startingBalance;
            const accounts = await ethers.getSigners();
            for (let i = startingIndex; i < startingIndex+additionalEntrants; i++) {
                const accountConnectedLottery = Lottery.connect(accounts[i]);
                await accountConnectedLottery.enterlottery({ value: entranceFee });
            }
            const startingTimeStamp = await Lottery.getLastTimestamp();
            await new Promise(async (resolve, reject) => {
                Lottery.once("WinnerSelected", async () => {
                    console.log("Winner selected event has fired!");
                    try {
                        const recentWinner = await Lottery.getRecentWinner();
                        const lotteryState = await Lottery.getLotteryState();
                        const winnerBalance = await accounts[2].getBalance();
                        const endingTimeStamp = await Lottery.getLastTimestamp();
                        expect(lotteryState.toString()).to.equal("0"); // 0 means open
                        assert(endingTimeStamp > startingTimeStamp)
                        expect(winnerBalance.toString()).to.equal(
                            startingBalance.add(entranceFee.mul(additionalEntrants)).add(entranceFee).toString()
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                try {
                    const txResponse = await Lottery.performUpkeep([]);
                    const txReceipt = await txResponse.wait(1);
                    startingBalance = await accounts[2].getBalance();
                    // const tx = await VRFCoordinatorMock.createSubscription();
                    // const txReceipt1 = await tx.wait(1);
                    // const subscriptionId = txReceipt1.events[0].args.subId;
                    // await VRFCoordinatorMock.fundSubscription(subscriptionId, ethers.utils.parseEther("1"));
                    await VRFCoordinatorMock.fulfillRandomWords(
                        txReceipt.events[1].args.requestId,
                        Lottery.address
                    );
                } catch (e) {
                    console.log("Error in fulfillRandomWords: ");
                    reject(e);
                }
            });
        });
    });
});

