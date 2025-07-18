// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/KeeperCompatibleInterface.sol";

error Lottery__TransferFailed();
error Lottery__NoPlayers();
error Lottery__NotOpen();
error Lottery__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 lotteryState);

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {

    enum LotteryState {
        OPEN,
        CLOSED,
        CALCULATING
    }

    // this implements chainlink's vrf2 and chainlink's keeper interface

    // State variables
    // i_ prefix for immutable variables
    // s_ prefix for storage variables
    // e_ prefix for events
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;

    // lottery variables
    address private s_recentWinner;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimestamp;
    uint256 private s_interval;

    // Events
    event LotteryEntered(address indexed player);
    event RequestRandomWinner(uint256 indexed requestId);
    event WinnerSelected(address indexed winner);

    constructor(address vrfCoordinatorV2, uint256 entranceFee, bytes32 gasLane, uint64 subscriptionId, uint32 callbackGasLimit, uint256 interval) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_gasLane = gasLane;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_lotteryState = LotteryState.OPEN; // Start with the lottery open
        s_lastTimestamp = block.timestamp; // Initialize the last timestamp
        s_interval = interval; // Set the interval for lottery closure
    }

    
    function enterlottery() public payable{
        require(msg.value >= i_entranceFee, "Not enough ETH to enter the lottery");
        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit LotteryEntered(msg.sender);
    }


    function checkUpkeep(bytes memory /*checkData*/) public view override returns (bool upkeepNeeded, bytes memory /*performData*/) {
        bool isOpen = (s_lotteryState == LotteryState.OPEN);
        bool timePassed = (block.timestamp - s_lastTimestamp) > s_interval;
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "");
        
    }
    //requestRandomWinner 
    function performUpkeep(bytes calldata /*performData*/) external override {
        // request a random number from Chainlink VRF
        (bool upkeepNeeded,) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery__UpkeepNotNeeded(address(this).balance, s_players.length, uint256(s_lotteryState));
        }
        s_lotteryState = LotteryState.CALCULATING;
        if (s_players.length == 0) {
            revert Lottery__NoPlayers();
        }
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestRandomWinner(requestId);
    }

    function fulfillRandomWords(uint256 /*requestId*/, uint256[] memory randomWords) internal override {
        uint256 winnerIndex = randomWords[0] % s_players.length;
        address payable winner = s_players[winnerIndex];
        s_recentWinner = winner;
        s_lotteryState = LotteryState.OPEN;
        // Reset the players array for the next lottery
        s_players = new address payable[](0);
        s_lastTimestamp = block.timestamp; // Update the last timestamp
        (bool success, ) = winner.call{value: address(this).balance}("");
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit WinnerSelected(winner);
    }

    function getPlayers() public view returns (address payable[] memory) {
        return s_players;
    }
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }
    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }
    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }
    function getnumwords() public pure returns (uint256) {
        return NUM_WORDS;
    }
    function getnoofPlayers() public view returns (uint256) {
        return s_players.length;
    }
    function getLastTimestamp() public view returns (uint256) {
        return s_lastTimestamp;
    }
    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }
    function getInterval() public view returns (uint256) {
        return s_interval;
    }
}