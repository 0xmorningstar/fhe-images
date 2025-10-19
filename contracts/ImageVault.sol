// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ImageVault
/// @notice Stores image metadata and an encrypted AES key seed (address A) using FHEVM
/// @dev Encrypted address uses the dedicated eaddress ciphertext type
contract ImageVault is SepoliaConfig {
    struct ImageRecord {
        string name;
        string ipfsHash;
        eaddress encryptedAddressA;
    }

    mapping(address => ImageRecord[]) private _records;

    event ImageSaved(address indexed owner, uint256 indexed index, string name, string ipfsHash);

    /// @notice Save an image record for the sender
    /// @param name The image name (e.g., file name)
    /// @param ipfsHash The pseudo IPFS hash (CID)
    /// @param encAddr External encrypted address handle (address A)
    /// @param inputProof The input proof coming from the relayer
    function saveImage(
        string calldata name,
        string calldata ipfsHash,
        externalEaddress encAddr,
        bytes calldata inputProof
    ) external {
        eaddress encrypted = FHE.fromExternal(encAddr, inputProof);

        // Persist
        _records[msg.sender].push(ImageRecord({name: name, ipfsHash: ipfsHash, encryptedAddressA: encrypted}));

        // Allow the contract and the owner to access/decrypt later via user decryption
        FHE.allowThis(encrypted);
        FHE.allow(encrypted, msg.sender);

        emit ImageSaved(msg.sender, _records[msg.sender].length - 1, name, ipfsHash);
    }

    /// @notice Number of images saved by a user
    /// @dev Must not rely on msg.sender in views per requirements
    function getImageCount(address user) external view returns (uint256) {
        return _records[user].length;
    }

    /// @notice Get image metadata (name and ipfs hash) for a user and index
    function getImageMeta(address user, uint256 index)
        external
        view
        returns (string memory name, string memory ipfsHash)
    {
        ImageRecord storage r = _records[user][index];
        return (r.name, r.ipfsHash);
    }

    /// @notice Get the encrypted address A for a user and index
    /// @dev The returned value is a ciphertext handle usable with the Relayer for user decryption
    function getEncryptedAddress(address user, uint256 index) external view returns (eaddress) {
        return _records[user][index].encryptedAddressA;
    }
}
