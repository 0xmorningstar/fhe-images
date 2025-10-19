import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Contract, Wallet } from 'ethers';
import { publicClient } from '../viemClient';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, IMAGE_STORE_ABI } from '../config/imageStore';
import { encryptBytes, decryptBytes, deriveAesKeyFromAddress } from '../utils/crypto';
import { putObject, getObject } from '../utils/db';

type Entry = { name: string; ipfsHash: string };

function bytesToHex(uint8: Uint8Array) {
  return Array.from(uint8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function fakeIpfsCid(data: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', data);
  // Produce a simple base16 CID-like string with prefix
  return 'bafy' + bytesToHex(new Uint8Array(digest)).slice(0, 46);
}

export function ImageApp() {
  const { address } = useAccount();
  const { instance } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState<string>('');
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [encBytes, setEncBytes] = useState<Uint8Array | null>(null);
  const [imgW, setImgW] = useState<number>(0);
  const [imgH, setImgH] = useState<number>(0);
  const encCanvasRef = useRef<HTMLCanvasElement>(null);
  const [randomAddress, setRandomAddress] = useState<string | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string>('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [decryptedUrls, setDecryptedUrls] = useState<Record<number, string>>({});
  const [loadingList, setLoadingList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const decryptedUrlRef = useRef<Record<number, string>>({});

  useEffect(() => {
    if (file) {
      setName(file.name);
      const url = URL.createObjectURL(file);
      setOriginalUrl(url);
    } else {
      setOriginalUrl('');
    }
  }, [file]);

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    // reset encrypted preview state
    setIpfsHash('');
    setEncBytes(null);
    setRandomAddress(null);
  };

  const doEncrypt = async () => {
    if (!file) return;
    const wa = Wallet.createRandom();
    const addr = wa.address;
    setRandomAddress(addr);
    const key = await deriveAesKeyFromAddress(addr);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { iv, ciphertext } = await encryptBytes(bytes, key);
    const encAll = new Uint8Array(iv.length + ciphertext.length);
    encAll.set(iv, 0);
    encAll.set(ciphertext, iv.length);
    setEncBytes(encAll);
    // keep encrypted bytes in memory; saved in IndexedDB upon mock upload

    // compute source image size for preview
    if (originalUrl) {
      const img = new Image();
      img.onload = () => {
        setImgW(img.naturalWidth);
        setImgH(img.naturalHeight);
      };
      img.src = originalUrl;
    }
  };

  const doMockUpload = async () => {
    if (!encBytes) return;
    const cid = await fakeIpfsCid(encBytes);
    await putObject(cid, encBytes);
    setIpfsHash(cid);
  };

  const doSaveOnChain = async () => {
    if (!address || !instance || !signerPromise || !randomAddress || !ipfsHash || !name) return;
    const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
    input.addAddress(randomAddress);
    const encryptedInput = await input.encrypt();
    const signer = await signerPromise;
    const contract = new Contract(CONTRACT_ADDRESS, IMAGE_STORE_ABI as any, signer);
    const tx = await contract.saveImage(name, ipfsHash, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();
    await loadList();
  };

  const loadList = async () => {
    if (!address) return;
    try {
      setLoadingList(true);
      // count
      const count = (await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: IMAGE_STORE_ABI as any,
        functionName: 'getImageCount',
        args: [address],
      })) as bigint;

      const items: Entry[] = [];
      for (let i = 0n; i < count; i++) {
        const meta = (await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: IMAGE_STORE_ABI as any,
          functionName: 'getImageMeta',
          args: [address, i],
        })) as [string, string];
        items.push({ name: meta[0], ipfsHash: meta[1] });
      }
      setEntries(items);
      setDecryptedUrls((prev) => {
        const next: Record<number, string> = {};
        items.forEach((_, idx) => {
          if (prev[idx]) {
            next[idx] = prev[idx];
          }
        });
        Object.keys(decryptedUrlRef.current).forEach((key) => {
          const idx = Number(key);
          if (!(idx in next)) {
            const existing = decryptedUrlRef.current[idx];
            if (existing) {
              URL.revokeObjectURL(existing);
            }
          }
        });
        decryptedUrlRef.current = { ...next };
        return next;
      });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    // draw encrypted bytes to canvas as noise preview
    if (!encBytes || !imgW || !imgH) return;
    const canvas = encCanvasRef.current;
    if (!canvas) return;
    const maxDim = 512; // cap preview size
    const ratio = Math.min(maxDim / imgW, maxDim / imgH, 1);
    const w = Math.max(1, Math.floor(imgW * ratio));
    const h = Math.max(1, Math.floor(imgH * ratio));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    let j = 0;
    for (let i = 0; i < w * h; i++) {
      const v = encBytes[j % encBytes.length];
      data[i * 4 + 0] = v;
      data[i * 4 + 1] = encBytes[(j + 123) % encBytes.length];
      data[i * 4 + 2] = encBytes[(j + 251) % encBytes.length];
      data[i * 4 + 3] = 255;
      j += 7;
    }
    ctx.putImageData(imgData, 0, 0);
  }, [encBytes, imgW, imgH]);

  const doDecryptAndShow = async (idx: number) => {
    if (!address || !instance) return;
    const meta = entries[idx];
    const encHandle = (await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: IMAGE_STORE_ABI as any,
      functionName: 'getEncryptedAddress',
      args: [address, BigInt(idx)],
    })) as string;

    const keypair = instance.generateKeypair();
    const handleContractPairs = [
      { handle: encHandle, contractAddress: CONTRACT_ADDRESS },
    ];
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = '7';
    const contractAddresses = [CONTRACT_ADDRESS];

    const signer = await signerPromise;
    if (!signer) return;
    // EIP712 signature
    const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
    const signature = await signer.signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message,
    );

    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace('0x', ''),
      contractAddresses,
      address,
      startTimeStamp,
      durationDays,
    );

    const addr = result[encHandle] as string;
    const key = await deriveAesKeyFromAddress(addr);
    const stored = await getObject(meta.ipfsHash);
    if (!stored) {
      alert('Encrypted image not found locally');
      return;
    }
    const iv = stored.slice(0, 12);
    const ct = stored.slice(12);
    const plain = await decryptBytes(ct, key, iv);
    const blob = new Blob([plain]);
    const url = URL.createObjectURL(blob);
    setDecryptedUrls((prev) => {
      if (decryptedUrlRef.current[idx]) {
        URL.revokeObjectURL(decryptedUrlRef.current[idx]);
      }
      decryptedUrlRef.current[idx] = url;
      return { ...prev, [idx]: url };
    });
  };

  useEffect(() => {
    return () => {
      Object.values(decryptedUrlRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
      decryptedUrlRef.current = {};
    };
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>FHE Image Vault</h2>
        <ConnectButton />
      </div>

      <section style={{ marginTop: '1rem', padding: '1rem', background: '#fff', border: '1px solid #eee', borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>Pick Image</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onSelect} />
            {originalUrl && (
              <div style={{ marginTop: 12 }}>
                <img src={originalUrl} style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #ddd' }} />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>Encrypted Preview</label>
            {encBytes ? (
              <div style={{ padding: 12, border: '1px dashed #aaa', borderRadius: 8, textAlign: 'center' }}>
                <canvas ref={encCanvasRef} style={{ maxWidth: '100%' }} />
              </div>
            ) : (
              <div style={{ padding: 12, border: '1px dashed #aaa', borderRadius: 8, color: '#666' }}>No encrypted data yet</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={doEncrypt} disabled={!file}>
            1) Encrypt with random address
          </button>
          <button onClick={doMockUpload} disabled={!encBytes}>
            2) Upload to IPFS (mock)
          </button>
          <button onClick={doSaveOnChain} disabled={!ipfsHash || !randomAddress || !address}>
            3) Save on-chain
          </button>
        </div>
        {randomAddress && <div style={{ marginTop: 8, color: '#444' }}>Address A: {randomAddress}</div>}
        {ipfsHash && <div style={{ marginTop: 8 }}>IPFS Hash: <code>{ipfsHash}</code></div>}
      </section>

      <section style={{ marginTop: '1rem', padding: '1rem', background: '#fff', border: '1px solid #eee', borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>My Images</h3>
        {!address ? (
          <div>Please connect wallet</div>
        ) : loadingList ? (
          <div>Loading…</div>
        ) : entries.length === 0 ? (
          <div>No images saved</div>
        ) : (
          entries.map((e, i) => {
            const previewUrl = decryptedUrls[i];
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.ipfsHash}</div>
                  {previewUrl && (
                    <div style={{ marginTop: 8 }}>
                      <img
                        src={previewUrl}
                        style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, border: '1px solid #ddd' }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => doDecryptAndShow(i)}>Decrypt & View</button>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
