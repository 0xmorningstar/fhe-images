// IMPORTANT: After deploying the contracts, copy the generated ABI from
// deployments/sepolia/ImageVault.json into the constant below as a TS array.
// Also set the deployed contract address.

export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: replace with deployed address

// Paste ABI from deployments here (no JSON files allowed in frontend)
export const IMAGE_STORE_ABI = [
  // placeholder; replace with actual ABI from deployments
  {
    "type": "function",
    "name": "saveImage",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "name", "type": "string" },
      { "name": "ipfsHash", "type": "string" },
      { "name": "encAddr", "type": "bytes" },
      { "name": "inputProof", "type": "bytes" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getImageCount",
    "stateMutability": "view",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "getImageMeta",
    "stateMutability": "view",
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "index", "type": "uint256" }
    ],
    "outputs": [
      { "name": "name", "type": "string" },
      { "name": "ipfsHash", "type": "string" }
    ]
  },
  {
    "type": "function",
    "name": "getEncryptedAddress",
    "stateMutability": "view",
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "index", "type": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "bytes" }
    ]
  }
];

