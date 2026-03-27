// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RECCOTransportLogger {
    event PickupRecorded(
        string batchId,
        string eventId,
        int256 lat,
        int256 lng,
        uint256 timestamp
    );

    event DeliveryRecorded(
        string batchId,
        string eventId,
        int256 lat,
        int256 lng,
        uint256 timestamp
    );

    function recordPickup(
        string calldata batchId,
        string calldata eventId,
        int256 lat,
        int256 lng,
        uint256 timestamp
    ) external {
        emit PickupRecorded(batchId, eventId, lat, lng, timestamp);
    }

    function recordDelivery(
        string calldata batchId,
        string calldata eventId,
        int256 lat,
        int256 lng,
        uint256 timestamp
    ) external {
        emit DeliveryRecorded(batchId, eventId, lat, lng, timestamp);
    }
}
