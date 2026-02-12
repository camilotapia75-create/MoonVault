// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MoonVault TimeLock
/// @notice Lock native ETH in a time-locked smart contract.
///         Once locked, funds cannot be withdrawn before the unlock time.
///         Includes fee system, cancellation, and description metadata.
contract MoonvaultTimeLock {
    enum LockStatus { Active, Unlocked, Cancelled }

    struct CryptoLock {
        address owner;
        address tokenAddress;   // address(0) for native ETH
        uint256 amount;
        uint256 unlockTime;     // Unix timestamp (seconds)
        LockStatus status;
        string description;
        bool isNativeToken;
        uint256 createdAt;
    }

    address public owner;
    address public feeAddress;
    uint256 public feePercentage = 50;            // 50/10000 = 0.5%
    uint256 public cancellationPenalty = 500;     // 500/10000 = 5%
    uint256 public minimumLockTime = 86400;       // 1 day in seconds
    uint256 public maximumLockTime = 315360000;   // ~10 years in seconds
    uint256 public lockCounter;
    uint256 public totalLockedValue;

    mapping(uint256 => CryptoLock) public locks;
    mapping(address => uint256[]) public userLocks;
    mapping(address => uint256) public userLockCount;

    event LockCreated(
        uint256 indexed lockId,
        address indexed owner,
        address indexed tokenAddress,
        uint256 amount,
        uint256 unlockTime,
        uint256 createdAt
    );

    event LockUnlocked(
        uint256 indexed lockId,
        address indexed owner,
        address indexed tokenAddress,
        uint256 amount,
        uint256 unlockedAt
    );

    event LockCancelled(
        uint256 indexed lockId,
        address indexed owner,
        uint256 amount
    );

    constructor(address _feeAddress) {
        require(_feeAddress != address(0), "Invalid fee address");
        owner = msg.sender;
        feeAddress = _feeAddress;
        lockCounter = 0;
    }

    receive() external payable {}

    /// @notice Lock native ETH until a specified time.
    /// @param _unlockTime Unlock time in MILLISECONDS (divided by 1000 internally).
    /// @param _description Human-readable description of the lock.
    /// @return The lock ID.
    function createNativeLock(uint256 _unlockTime, string calldata _description) external payable returns (uint256) {
        require(msg.value > 0, "Must send native tokens");

        uint256 unlockTimeSeconds = _unlockTime / 1000;
        require(unlockTimeSeconds > block.timestamp + minimumLockTime, "Unlock time too soon");
        require(unlockTimeSeconds <= block.timestamp + maximumLockTime, "Unlock time too far");

        uint256 lockId = lockCounter;

        locks[lockId] = CryptoLock({
            owner: msg.sender,
            tokenAddress: address(0),
            amount: msg.value,
            unlockTime: unlockTimeSeconds,
            status: LockStatus.Active,
            description: _description,
            isNativeToken: true,
            createdAt: block.timestamp
        });

        userLocks[msg.sender].push(lockId);
        userLockCount[msg.sender]++;
        lockCounter++;
        totalLockedValue += msg.value;

        emit LockCreated(lockId, msg.sender, address(0), msg.value, unlockTimeSeconds, block.timestamp);

        return lockId;
    }

    /// @notice Withdraw funds from an expired lock.
    /// @param _lockId The lock to withdraw from.
    function unlockCrypto(uint256 _lockId) external {
        require(_lockId < lockCounter, "Lock does not exist");
        require(msg.sender == locks[_lockId].owner, "Not lock owner");
        require(locks[_lockId].status == LockStatus.Active, "Lock not active");

        CryptoLock storage lock = locks[_lockId];
        require(block.timestamp >= lock.unlockTime, "Time lock not reached");

        uint256 fee = (lock.amount * feePercentage) / 10000;
        uint256 payout = lock.amount - fee;

        lock.status = LockStatus.Unlocked;
        totalLockedValue -= lock.amount;

        if (fee > 0) {
            (bool feeSuccess, ) = feeAddress.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        (bool success, ) = lock.owner.call{value: payout}("");
        require(success, "Transfer failed");

        emit LockUnlocked(_lockId, lock.owner, address(0), payout, block.timestamp);
    }

    /// @notice Cancel an active lock with a 5% penalty sent to feeAddress.
    /// @param _lockId The lock to cancel.
    function cancelLock(uint256 _lockId) external {
        require(_lockId < lockCounter, "Lock does not exist");
        require(msg.sender == locks[_lockId].owner, "Not lock owner");
        require(locks[_lockId].status == LockStatus.Active, "Lock not active");

        CryptoLock storage lock = locks[_lockId];
        uint256 amount = lock.amount;
        uint256 penalty = (amount * cancellationPenalty) / 10000;
        uint256 refund = amount - penalty;

        lock.status = LockStatus.Cancelled;
        totalLockedValue -= amount;

        if (penalty > 0) {
            (bool penaltySent, ) = feeAddress.call{value: penalty}("");
            require(penaltySent, "Penalty transfer failed");
        }

        (bool success, ) = lock.owner.call{value: refund}("");
        require(success, "Refund failed");

        emit LockCancelled(_lockId, lock.owner, refund);
    }

    // ----- View Functions -----

    function getActiveLockCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < lockCounter; i++) {
            if (locks[i].status == LockStatus.Active) {
                count++;
            }
        }
        return count;
    }

    function getUserLocks(address _user) external view returns (uint256[] memory) {
        return userLocks[_user];
    }

    function getLock(uint256 _lockId) external view returns (CryptoLock memory) {
        require(_lockId < lockCounter, "Lock does not exist");
        return locks[_lockId];
    }

    function isReadyToUnlock(uint256 _lockId) external view returns (bool) {
        require(_lockId < lockCounter, "Lock does not exist");
        return locks[_lockId].status == LockStatus.Active && block.timestamp >= locks[_lockId].unlockTime;
    }

    function getTimeRemaining(uint256 _lockId) external view returns (int256) {
        require(_lockId < lockCounter, "Lock does not exist");
        CryptoLock memory lock = locks[_lockId];
        if (lock.status != LockStatus.Active) return 0;
        return int256(lock.unlockTime) - int256(block.timestamp);
    }

    function calculateFee(uint256 _amount) external view returns (uint256) {
        return (_amount * feePercentage) / 10000;
    }

    // ----- Admin Functions -----

    function setFeeAddress(address _newFeeAddress) external {
        require(msg.sender == owner, "Only owner");
        require(_newFeeAddress != address(0), "Invalid address");
        feeAddress = _newFeeAddress;
    }

    function setFeePercentage(uint256 _newFeePercentage) external {
        require(msg.sender == owner, "Only owner");
        require(_newFeePercentage <= 1000, "Fee too high");
        feePercentage = _newFeePercentage;
    }
}
