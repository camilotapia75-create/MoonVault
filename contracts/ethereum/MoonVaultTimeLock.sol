// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IERC20.sol";

/// @title MoonVault TimeLock
/// @notice Lock ETH or ERC-20 tokens until a specified unlock date.
///         Once locked, funds cannot be withdrawn before the unlock time.
contract MoonVaultTimeLock {
    struct LockInfo {
        uint256 id;
        address owner;
        address token;      // address(0) for native ETH
        uint256 amount;
        uint256 unlockTime;
        bool withdrawn;
    }

    uint256 public nextLockId;
    mapping(uint256 => LockInfo) public locks;
    mapping(address => uint256[]) public userLockIds;

    event LockCreated(
        uint256 indexed lockId,
        address indexed owner,
        address token,
        uint256 amount,
        uint256 unlockTime
    );

    event Withdrawn(uint256 indexed lockId, address indexed owner, uint256 amount);

    error UnlockTimeInPast();
    error ZeroAmount();
    error LockNotFound();
    error NotOwner();
    error StillLocked();
    error AlreadyWithdrawn();
    error TransferFailed();

    /// @notice Lock native ETH until `unlockTime`.
    /// @param unlockTime Unix timestamp when the lock expires.
    /// @return lockId The unique identifier for this lock.
    function createLock(uint256 unlockTime) external payable returns (uint256 lockId) {
        if (unlockTime <= block.timestamp) revert UnlockTimeInPast();
        if (msg.value == 0) revert ZeroAmount();

        lockId = nextLockId++;
        locks[lockId] = LockInfo({
            id: lockId,
            owner: msg.sender,
            token: address(0),
            amount: msg.value,
            unlockTime: unlockTime,
            withdrawn: false
        });
        userLockIds[msg.sender].push(lockId);

        emit LockCreated(lockId, msg.sender, address(0), msg.value, unlockTime);
    }

    /// @notice Lock ERC-20 tokens until `unlockTime`.
    /// @dev Caller must approve this contract to spend `amount` tokens first.
    /// @param token The ERC-20 token contract address.
    /// @param amount The number of tokens to lock.
    /// @param unlockTime Unix timestamp when the lock expires.
    /// @return lockId The unique identifier for this lock.
    function createTokenLock(
        address token,
        uint256 amount,
        uint256 unlockTime
    ) external returns (uint256 lockId) {
        if (unlockTime <= block.timestamp) revert UnlockTimeInPast();
        if (amount == 0) revert ZeroAmount();

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        lockId = nextLockId++;
        locks[lockId] = LockInfo({
            id: lockId,
            owner: msg.sender,
            token: token,
            amount: amount,
            unlockTime: unlockTime,
            withdrawn: false
        });
        userLockIds[msg.sender].push(lockId);

        emit LockCreated(lockId, msg.sender, token, amount, unlockTime);
    }

    /// @notice Withdraw funds from an expired lock.
    /// @param lockId The lock to withdraw from.
    function withdraw(uint256 lockId) external {
        LockInfo storage lock = locks[lockId];
        if (lock.owner == address(0)) revert LockNotFound();
        if (lock.owner != msg.sender) revert NotOwner();
        if (block.timestamp < lock.unlockTime) revert StillLocked();
        if (lock.withdrawn) revert AlreadyWithdrawn();

        lock.withdrawn = true;

        if (lock.token == address(0)) {
            (bool sent, ) = payable(msg.sender).call{value: lock.amount}("");
            if (!sent) revert TransferFailed();
        } else {
            bool success = IERC20(lock.token).transfer(msg.sender, lock.amount);
            if (!success) revert TransferFailed();
        }

        emit Withdrawn(lockId, msg.sender, lock.amount);
    }

    /// @notice Get all lock IDs for a user.
    function getUserLockIds(address user) external view returns (uint256[] memory) {
        return userLockIds[user];
    }

    /// @notice Get full lock details for a user.
    function getUserLocks(address user) external view returns (LockInfo[] memory) {
        uint256[] memory ids = userLockIds[user];
        LockInfo[] memory result = new LockInfo[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = locks[ids[i]];
        }
        return result;
    }

    /// @notice Get a single lock's details.
    function getLock(uint256 lockId) external view returns (LockInfo memory) {
        return locks[lockId];
    }
}
