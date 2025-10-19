import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("ImageVault (mock)", function () {
  let signers: Signers;
  let vault: any;
  let vaultAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    const factory = await ethers.getContractFactory("ImageVault");
    vault = await factory.deploy();
    vaultAddress = await vault.getAddress();
  });

  it("saves and retrieves metadata and encrypted address", async function () {
    const name = "cat.png";
    const ipfs = "bafyfakecid";
    const addrHex = "0x1234567890abcdef1234567890abcdef12345678";
    const enc = await fhevm.createEncryptedInput(vaultAddress, signers.alice.address)
      .addAddress(addrHex)
      .encrypt();

    const tx = await vault.connect(signers.alice).saveImage(name, ipfs, enc.handles[0], enc.inputProof);
    await tx.wait();

    const count = await vault.getImageCount(signers.alice.address);
    expect(count).to.eq(1n);

    const meta = await vault.getImageMeta(signers.alice.address, 0);
    expect(meta[0]).to.eq(name);
    expect(meta[1]).to.eq(ipfs);

    const encHandle = await vault.getEncryptedAddress(signers.alice.address, 0);
    expect(encHandle).to.not.eq(ethers.ZeroHash);

    // user decrypt
    const clear = await fhevm.userDecryptEaddress(encHandle, vaultAddress, signers.alice);
    expect(clear).to.eq(ethers.getAddress(addrHex));
  });
});
