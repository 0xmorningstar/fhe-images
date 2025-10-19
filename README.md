# FHE Image Vault

A decentralized, privacy-preserving image storage system built with Fully Homomorphic Encryption (FHE) technology powered by Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine).

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Problem Statement](#problem-statement)
- [Solution Architecture](#solution-architecture)
- [How It Works](#how-it-works)
- [Advantages](#advantages)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Smart Contract Details](#smart-contract-details)
- [Security Considerations](#security-considerations)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)

## Overview

FHE Image Vault is a revolutionary decentralized application (dApp) that enables users to store and manage images with military-grade privacy guarantees. By leveraging Fully Homomorphic Encryption (FHE) and blockchain technology, users can encrypt their images client-side and store encryption keys on-chain without ever revealing the actual decryption keys to anyone—not even the blockchain validators.

The system uses a novel approach where images are encrypted using AES-GCM with a key derived from a randomly generated Ethereum address. This address is then encrypted using FHEVM's native `eaddress` type and stored on-chain, ensuring that only the legitimate owner can decrypt and retrieve their images.

## Key Features

### Privacy-First Design
- **Client-Side Encryption**: All images are encrypted in the browser before leaving the user's device
- **Zero-Knowledge Architecture**: The blockchain and smart contract never see unencrypted data
- **User-Controlled Access**: Only the owner can decrypt their images through FHE user decryption

### Blockchain Integration
- **Immutable Records**: Image metadata and encrypted keys stored permanently on-chain
- **Decentralized Storage**: IPFS integration for storing encrypted image data
- **Wallet-Based Authentication**: Uses MetaMask and other Web3 wallets for user identity

### Advanced Cryptography
- **FHE Technology**: Leverages Zama's FHEVM for performing computations on encrypted data
- **AES-GCM Encryption**: Industry-standard symmetric encryption for image data
- **Dedicated Address Type**: Uses FHEVM's `eaddress` ciphertext type for encrypting Ethereum addresses

### User Experience
- **Intuitive Interface**: Clean, modern UI built with React
- **Real-Time Preview**: See encrypted data visualization before upload
- **One-Click Decryption**: Seamlessly decrypt and view images from the vault
- **Transaction Transparency**: Track all operations through blockchain events

## Technology Stack

### Smart Contract Layer
- **Solidity ^0.8.24**: Smart contract programming language
- **FHEVM (@fhevm/solidity)**: Zama's FHE library for Solidity
- **Hardhat**: Ethereum development environment
- **TypeChain**: TypeScript bindings for smart contracts
- **Sepolia Testnet**: Ethereum test network deployment

### Frontend Application
- **React 19**: Modern UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Ethers.js v6**: Ethereum wallet and provider library
- **Viem**: Type-safe Ethereum interactions
- **Wagmi**: React hooks for Ethereum
- **RainbowKit**: Wallet connection UI components
- **TanStack Query**: Async state management

### Cryptography & Storage
- **@zama-fhe/relayer-sdk**: FHE relayer integration for user decryption
- **Web Crypto API**: Native browser cryptography (AES-GCM)
- **IndexedDB**: Browser-based storage for encrypted images
- **IPFS (mock)**: Decentralized file storage (currently simulated)

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Mocha & Chai**: Testing framework
- **Hardhat Deploy**: Smart contract deployment management

## Problem Statement

Traditional cloud storage solutions and even many blockchain-based alternatives face several critical issues:

1. **Privacy Vulnerabilities**: Centralized services have access to user data, creating single points of failure and privacy risks
2. **Trust Requirements**: Users must trust service providers not to access, leak, or misuse their data
3. **Regulatory Risks**: Jurisdictional laws may require providers to hand over user data
4. **Censorship Concerns**: Centralized platforms can delete or restrict access to content
5. **Limited User Control**: Users don't have true ownership of their data and encryption keys
6. **Blockchain Transparency Paradox**: Public blockchains are transparent by design, making private data storage challenging
7. **Key Management Complexity**: Securely storing encryption keys is difficult for average users

## Solution Architecture

FHE Image Vault solves these problems through a multi-layered approach:

### 1. Client-Side Encryption
Images are encrypted using AES-GCM with a key derived from a randomly generated Ethereum address (Address A). This ensures:
- Data never leaves the device unencrypted
- No central authority has access to encryption keys
- Users maintain full control over their data

### 2. FHE-Encrypted Key Storage
The random address (Address A) is encrypted using FHEVM's homomorphic encryption and stored on-chain:
- The blockchain stores encrypted data without being able to read it
- Validators and nodes cannot access the actual address
- Only the user can decrypt through the FHE user decryption protocol

### 3. Decentralized File Storage
Encrypted images are stored on IPFS (currently mocked with IndexedDB):
- No single point of failure
- Content-addressed storage ensures data integrity
- Censorship-resistant architecture

### 4. Smart Contract Orchestration
The `ImageVault` contract manages:
- Encrypted key storage with proper access controls
- Image metadata (name, IPFS hash)
- Permission management via FHE's `allow` mechanism
- Event emission for indexing and tracking

## How It Works

### Image Upload Flow

1. **Image Selection**: User selects an image file in the browser
2. **Random Key Generation**: System generates a random Ethereum address (Address A)
3. **Key Derivation**: AES-256 key is derived from Address A using SHA-256
4. **Image Encryption**: Image is encrypted with AES-GCM using the derived key
5. **IPFS Upload**: Encrypted image is uploaded to IPFS (currently stored locally in IndexedDB)
6. **FHE Encryption**: Address A is encrypted using FHEVM's encryption protocol
7. **On-Chain Storage**: Smart contract stores:
   - Image name
   - IPFS content hash (CID)
   - FHE-encrypted Address A
8. **Permission Setting**: Contract grants decryption permission to the user and contract

### Image Retrieval Flow

1. **List Images**: User views their image list from the smart contract
2. **Request Decryption**: User clicks to decrypt a specific image
3. **Keypair Generation**: FHE instance generates a temporary keypair
4. **EIP-712 Signature**: User signs a typed data request with their wallet
5. **User Decryption**: FHE relayer decrypts Address A using the signature
6. **Key Reconstruction**: AES key is re-derived from decrypted Address A
7. **Image Retrieval**: Encrypted image is fetched from IPFS/IndexedDB
8. **Image Decryption**: Image is decrypted client-side using the AES key
9. **Display**: Decrypted image is displayed in a new browser tab

## Advantages

### Unparalleled Privacy
- **Zero Trust**: No party—including the blockchain, validators, or contract owner—can access your images
- **Cryptographic Guarantees**: Security proven by mathematics, not trust
- **No Data Leakage**: Metadata leakage minimized through encryption

### True Decentralization
- **No Central Authority**: No company, server, or individual controls the system
- **Censorship Resistance**: Images cannot be removed or blocked by any central party
- **Permissionless**: Anyone can use the system without approval

### User Sovereignty
- **Self-Custody**: Users control their own keys and data
- **Portable**: Data can be accessed from any device with wallet access
- **Permanence**: Images stored permanently on immutable blockchain and IPFS

### Cutting-Edge Technology
- **FHE Innovation**: One of the first practical applications of FHE for consumer use
- **Production-Ready**: Built on Zama's battle-tested FHEVM technology
- **Future-Proof**: Architecture designed for upcoming FHE advancements

### Developer-Friendly
- **Open Source**: Fully transparent and auditable code
- **Well-Documented**: Clear documentation and code comments
- **Extensible**: Easy to build upon or integrate into other projects
- **Type-Safe**: Full TypeScript support throughout

## Project Structure

```
fhe-images/
├── contracts/                    # Smart contracts
│   └── ImageVault.sol           # Main FHE image vault contract
├── test/                        # Smart contract tests
│   └── ImageVault.ts            # Comprehensive test suite
├── deploy/                      # Deployment scripts (Hardhat Deploy)
├── app/                         # Frontend application
│   ├── src/
│   │   ├── components/
│   │   │   └── ImageApp.tsx    # Main application component
│   │   ├── config/
│   │   │   ├── imageStore.ts   # Contract ABI and address
│   │   │   └── wagmi.ts        # Wagmi configuration
│   │   ├── hooks/
│   │   │   ├── useZamaInstance.ts    # FHE instance hook
│   │   │   └── useEthersSigner.ts    # Ethers signer hook
│   │   ├── utils/
│   │   │   ├── crypto.ts       # AES encryption utilities
│   │   │   └── db.ts           # IndexedDB wrapper
│   │   ├── App.tsx             # App root
│   │   ├── main.tsx            # Entry point
│   │   └── viemClient.ts       # Viem public client
│   ├── package.json
│   └── vite.config.ts
├── hardhat.config.ts            # Hardhat configuration
├── package.json                 # Project dependencies
└── README.md                    # This file
```

## Installation

### Prerequisites

- **Node.js**: >= 20.x
- **npm**: >= 7.0.0
- **MetaMask**: Browser extension installed
- **Sepolia ETH**: Testnet tokens for gas fees

### Smart Contract Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fhe-images.git
cd fhe-images
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Set your mnemonic
npx hardhat vars set MNEMONIC

# Set your Infura API key for network access
npx hardhat vars set INFURA_API_KEY

# Optional: Set Etherscan API key for contract verification
npx hardhat vars set ETHERSCAN_API_KEY
```

4. Compile contracts:
```bash
npm run compile
```

5. Run tests:
```bash
npm test
```

6. Deploy to local network:
```bash
# Start a local FHEVM-ready node
npx hardhat node

# In another terminal, deploy to local network
npx hardhat deploy --network localhost
```

7. Deploy to Sepolia Testnet:
```bash
# Deploy to Sepolia
npx hardhat deploy --network sepolia

# Verify contract on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Frontend Setup

1. Navigate to app directory:
```bash
cd app
```

2. Install dependencies:
```bash
npm install
```

3. Update contract address:
```typescript
// In app/src/config/imageStore.ts
export const CONTRACT_ADDRESS = 'your_deployed_contract_address';
```

4. Start development server:
```bash
npm run dev
```

5. Open browser:
```
http://localhost:5173
```

## Usage

### Uploading Images

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Select Image**: Click "Pick Image" and choose an image file from your device
3. **Encrypt**: Click "1) Encrypt with random address"
   - A random Ethereum address is generated
   - Image is encrypted using AES-GCM
   - Encrypted preview is displayed
4. **Upload to IPFS**: Click "2) Upload to IPFS (mock)"
   - Encrypted data is stored in browser's IndexedDB
   - A fake CID (Content Identifier) is generated
5. **Save On-Chain**: Click "3) Save on-chain"
   - Random address is FHE-encrypted
   - Transaction is sent to the smart contract
   - Metadata and encrypted key are stored on-chain
   - Confirm transaction in MetaMask

### Viewing Images

1. **View List**: Your images appear in the "My Images" section
2. **Decrypt**: Click "Decrypt & Open" on any image
   - FHE user decryption protocol is initiated
   - Sign the EIP-712 typed data request in MetaMask
   - Address is decrypted via FHE relayer
   - Image is retrieved from storage and decrypted
   - Decrypted image opens in a new tab

### Managing Images

- **Image Count**: Automatically displayed in your vault
- **Image Metadata**: Each entry shows name and IPFS hash
- **Persistent Storage**: All data persists across browser sessions

## Smart Contract Details

### ImageVault Contract

**File**: `contracts/ImageVault.sol`

#### Data Structures

```solidity
struct ImageRecord {
    string name;              // Image filename
    string ipfsHash;          // IPFS content identifier
    eaddress encryptedAddressA;  // FHE-encrypted random address
}
```

#### Key Functions

**saveImage**
```solidity
function saveImage(
    string calldata name,
    string calldata ipfsHash,
    externalEaddress encAddr,
    bytes calldata inputProof
) external
```
- Stores image metadata and encrypted address
- Sets up permissions for user decryption
- Emits `ImageSaved` event

**getImageCount**
```solidity
function getImageCount(address user) external view returns (uint256)
```
- Returns total number of images for a user

**getImageMeta**
```solidity
function getImageMeta(address user, uint256 index)
    external view returns (string memory name, string memory ipfsHash)
```
- Retrieves image name and IPFS hash

**getEncryptedAddress**
```solidity
function getEncryptedAddress(address user, uint256 index)
    external view returns (eaddress)
```
- Returns FHE-encrypted address for user decryption

#### Events

```solidity
event ImageSaved(
    address indexed owner,
    uint256 indexed index,
    string name,
    string ipfsHash
)
```

## Security Considerations

### Cryptographic Security

- **AES-GCM**: Authenticated encryption prevents tampering
- **256-bit Keys**: Derived from Ethereum addresses via SHA-256
- **Random IVs**: Each encryption uses a unique initialization vector
- **FHE Protection**: Address encryption uses Zama's audited FHEVM

### Smart Contract Security

- **Access Controls**: FHE `allow` mechanism restricts decryption
- **Input Validation**: Contract validates all inputs and proofs
- **Event Logging**: All operations emit events for transparency
- **No Reentrancy**: Simple state changes prevent reentrancy attacks

### Known Limitations

1. **IPFS Simulation**: Currently uses IndexedDB instead of actual IPFS
   - Encrypted images only stored locally
   - No true decentralization of file storage yet

2. **Key Derivation**: Deterministic derivation from address
   - Same address always produces same key
   - Address randomness is critical

3. **Browser Storage**: IndexedDB can be cleared by user
   - May result in data loss if IPFS not implemented

4. **Gas Costs**: FHE operations are more expensive than standard transactions

5. **Network Dependency**: Currently only deployed on Sepolia testnet
   - Mainnet deployment requires additional testing and auditing

### Best Practices

- **Backup Important Images**: Keep local copies of critical images
- **Secure Your Wallet**: Use hardware wallets for valuable accounts
- **Verify Transactions**: Always review transaction details before signing
- **Keep Private Keys Safe**: Never share your wallet's private key
- **Test First**: Use testnet extensively before mainnet deployment

## Future Roadmap

### Phase 1: Core Improvements (Q2 2025)
- [ ] **Real IPFS Integration**: Replace IndexedDB with actual IPFS nodes
- [ ] **Pinning Service**: Integrate with Pinata or web3.storage for persistence
- [ ] **Image Thumbnails**: Generate and store encrypted thumbnails on-chain
- [ ] **Batch Operations**: Upload and decrypt multiple images at once
- [ ] **Progress Indicators**: Show upload/download progress
- [ ] **Error Handling**: Improve error messages and recovery

### Phase 2: Feature Expansion (Q3 2025)
- [ ] **Image Sharing**: Share encrypted images with other addresses
- [ ] **Access Control**: Time-limited or conditional access permissions
- [ ] **Image Collections**: Organize images into albums or folders
- [ ] **Search & Filter**: Search by name, date, or custom tags
- [ ] **Image Editing**: Basic editing tools (crop, rotate, resize)
- [ ] **Metadata Encryption**: Encrypt image names and tags as well

### Phase 3: Advanced Features (Q4 2025)
- [ ] **Mobile App**: React Native application for iOS and Android
- [ ] **Multi-Chain Support**: Deploy to Ethereum mainnet, Polygon, etc.
- [ ] **NFT Integration**: Mint encrypted images as NFTs
- [ ] **Social Features**: Comments, likes, and sharing on encrypted images
- [ ] **Storage Tiers**: Different pricing tiers for storage limits
- [ ] **Backup & Recovery**: Social recovery for lost wallet access

### Phase 4: Ecosystem Development (2026)
- [ ] **API & SDK**: Developer tools for integration
- [ ] **Marketplace**: Buy/sell encrypted digital assets
- [ ] **Enterprise Features**: Team accounts and admin controls
- [ ] **Compliance Tools**: GDPR-compliant data deletion
- [ ] **Analytics Dashboard**: Usage statistics and insights
- [ ] **Decentralized Identity**: Integration with DIDs and VCs

### Research & Innovation
- [ ] **Serverless Image Processing**: FHE-based image transformations
- [ ] **Homomorphic Compression**: Compress images while encrypted
- [ ] **Privacy-Preserving ML**: Train models on encrypted images
- [ ] **Cross-Chain Bridges**: Move encrypted assets between chains
- [ ] **Zero-Knowledge Proofs**: Prove image properties without revealing content

### Infrastructure & Scalability
- [ ] **Layer 2 Integration**: Deploy to zkSync, Arbitrum for lower fees
- [ ] **Indexing Service**: The Graph integration for fast queries
- [ ] **CDN Integration**: Decentralized CDN for encrypted data
- [ ] **Sharding Support**: Distribute large files across multiple nodes
- [ ] **Automated Testing**: Comprehensive E2E and integration tests

### Community & Governance
- [ ] **Documentation**: Comprehensive guides and tutorials
- [ ] **Bug Bounty**: Security researcher incentive program
- [ ] **DAO Structure**: Community governance for protocol upgrades
- [ ] **Grant Program**: Fund ecosystem developers
- [ ] **Ambassador Program**: Community leaders and educators

## Contributing

We welcome contributions from the community! Here's how you can help:

### Getting Started

1. **Fork the Repository**: Click the "Fork" button on GitHub
2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/yourusername/fhe-images.git
   ```
3. **Create a Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make Changes**: Implement your feature or fix
5. **Test Thoroughly**: Ensure all tests pass
   ```bash
   npm test
   npm run lint
   ```
6. **Commit Changes**:
   ```bash
   git commit -m "Add: your feature description"
   ```
7. **Push to Fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Create Pull Request**: Submit PR with detailed description

### Contribution Guidelines

- **Code Style**: Follow existing patterns, use ESLint and Prettier
- **Testing**: Add tests for new features
- **Documentation**: Update README and code comments
- **Commit Messages**: Use conventional commits format
- **Small PRs**: Keep changes focused and manageable
- **Respect**: Follow our code of conduct

### Areas for Contribution

- **Smart Contracts**: Gas optimizations, new features, security improvements
- **Frontend**: UI/UX enhancements, accessibility, mobile responsiveness
- **Testing**: Additional test cases, edge case coverage
- **Documentation**: Tutorials, guides, API documentation
- **Infrastructure**: CI/CD, deployment scripts, monitoring
- **Research**: FHE optimizations, new cryptographic approaches

### Reporting Issues

- **Bug Reports**: Include reproduction steps, expected vs actual behavior
- **Feature Requests**: Explain use case and expected benefits
- **Security Issues**: Report privately to security@example.com

## License

This project is licensed under the **BSD-3-Clause-Clear License**.

### What This Means

- ✅ **Commercial Use**: You can use this in commercial projects
- ✅ **Modification**: You can modify the code for your needs
- ✅ **Distribution**: You can distribute original or modified versions
- ✅ **Private Use**: You can use it privately
- ❌ **Patent Use**: No patent rights granted (BSD-Clear provision)
- ℹ️ **Liability**: Software provided "as is" without warranty
- ℹ️ **Attribution**: Must include original license and copyright notice

See the [LICENSE](LICENSE) file for full details.

## Acknowledgments

- **Zama**: For pioneering FHEVM technology and providing exceptional developer tools
- **Ethereum Foundation**: For the robust blockchain infrastructure
- **IPFS/Protocol Labs**: For decentralized storage innovation
- **RainbowKit**: For beautiful wallet connection components
- **Hardhat**: For the excellent development environment
- **Open Source Community**: For countless libraries and tools that made this possible

## Contact & Support

- **GitHub Issues**: [https://github.com/yourusername/fhe-images/issues](https://github.com/yourusername/fhe-images/issues)
- **Documentation**: [FHEVM Docs](https://docs.zama.ai/fhevm)
- **Community**: [Zama Discord](https://discord.gg/zama)

## Links & Resources

- **Zama Documentation**: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- **FHEVM GitHub**: [https://github.com/zama-ai/fhevm](https://github.com/zama-ai/fhevm)
- **Ethereum**: [https://ethereum.org](https://ethereum.org)
- **IPFS**: [https://ipfs.tech](https://ipfs.tech)
- **Web3 Security**: [https://consensys.github.io/smart-contract-best-practices/](https://consensys.github.io/smart-contract-best-practices/)

---

**Built with ❤️ using Fully Homomorphic Encryption**

*Making privacy practical, one encrypted pixel at a time.*
