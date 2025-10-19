import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Contract, Wallet } from 'ethers';
import { publicClient } from '../viemClient';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, IMAGE_STORE_ABI } from '../config/imageStore';
import { encryptBytes, decryptBytes, deriveAesKeyFromAddress } from '../utils/crypto';
import { putObject, getObject, DEFAULT_MIME } from '../utils/db';

type Entry = { name: string; ipfsHash: string };

function bytesToHex(uint8: Uint8Array) {
  return Array.from(uint8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function guessMimeType(name: string, fallback: string = DEFAULT_MIME) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'svg':
      return 'image/svg+xml';
    case 'avif':
      return 'image/avif';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return fallback;
  }
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
    if (!encBytes || !file) return;
    const cid = await fakeIpfsCid(encBytes);
    const mime = file.type || guessMimeType(file.name, DEFAULT_MIME);
    await putObject(cid, { cipher: encBytes, mime });
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
    const iv = stored.cipher.slice(0, 12);
    const ct = stored.cipher.slice(12);
    const plain = await decryptBytes(ct, key, iv);
    const mime = stored.mime && stored.mime !== DEFAULT_MIME ? stored.mime : guessMimeType(meta.name, DEFAULT_MIME);
    const blob = new Blob([plain], { type: mime });
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              color: '#fff',
              fontSize: '2.5rem',
              fontWeight: 700,
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              🔐 FHE Image Vault
            </h1>
            <p style={{
              margin: '0.5rem 0 0 0',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '1rem'
            }}>
              Privacy-preserving image storage with Fully Homomorphic Encryption
            </p>
          </div>
          <ConnectButton />
        </div>

        {/* Upload Section */}
        <section style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 1.5rem 0',
            fontSize: '1.5rem',
            color: '#1a202c',
            fontWeight: 600
          }}>
            📤 Upload New Image
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            {/* Original Image */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: 12,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#4a5568',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Original Image
              </label>
              <div style={{
                border: '2px dashed #cbd5e0',
                borderRadius: 12,
                padding: '1.5rem',
                textAlign: 'center',
                background: '#f7fafc',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {!originalUrl ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onSelect}
                      style={{ display: 'none' }}
                      id="file-input"
                    />
                    <label
                      htmlFor="file-input"
                      style={{
                        cursor: 'pointer',
                        padding: '0.75rem 1.5rem',
                        background: '#667eea',
                        color: 'white',
                        borderRadius: 8,
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        display: 'inline-block'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#5568d3'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#667eea'}
                    >
                      Choose Image
                    </label>
                    <p style={{ marginTop: '1rem', color: '#718096', fontSize: '0.875rem' }}>
                      Click to select an image file
                    </p>
                  </>
                ) : (
                  <div style={{ width: '100%' }}>
                    <img
                      src={originalUrl}
                      style={{
                        maxWidth: '100%',
                        maxHeight: 300,
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <button
                      onClick={() => {
                        setFile(null);
                        setEncBytes(null);
                        setIpfsHash('');
                        setRandomAddress(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        background: '#fc8181',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Encrypted Preview */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: 12,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#4a5568',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Encrypted Preview
              </label>
              <div style={{
                border: '2px dashed #cbd5e0',
                borderRadius: 12,
                padding: '1.5rem',
                textAlign: 'center',
                background: '#f7fafc',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {encBytes ? (
                  <div style={{ width: '100%' }}>
                    <canvas
                      ref={encCanvasRef}
                      style={{
                        maxWidth: '100%',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <p style={{ marginTop: '1rem', color: '#718096', fontSize: '0.875rem' }}>
                      ✅ Encrypted with AES-GCM
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '3rem', opacity: 0.3 }}>🔒</div>
                    <p style={{ color: '#718096', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      No encrypted data yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={doEncrypt}
              disabled={!file}
              style={{
                flex: 1,
                minWidth: 200,
                padding: '1rem 1.5rem',
                background: file ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e2e8f0',
                color: file ? 'white' : '#a0aec0',
                border: 'none',
                borderRadius: 8,
                fontSize: '1rem',
                fontWeight: 600,
                cursor: file ? 'pointer' : 'not-allowed',
                boxShadow: file ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => file && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              1️⃣ Encrypt Image
            </button>
            <button
              onClick={doMockUpload}
              disabled={!encBytes}
              style={{
                flex: 1,
                minWidth: 200,
                padding: '1rem 1.5rem',
                background: encBytes ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : '#e2e8f0',
                color: encBytes ? 'white' : '#a0aec0',
                border: 'none',
                borderRadius: 8,
                fontSize: '1rem',
                fontWeight: 600,
                cursor: encBytes ? 'pointer' : 'not-allowed',
                boxShadow: encBytes ? '0 4px 12px rgba(240, 147, 251, 0.4)' : 'none',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => encBytes && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              2️⃣ Upload to Storage
            </button>
            <button
              onClick={doSaveOnChain}
              disabled={!ipfsHash || !randomAddress || !address}
              style={{
                flex: 1,
                minWidth: 200,
                padding: '1rem 1.5rem',
                background: (ipfsHash && randomAddress && address) ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' : '#e2e8f0',
                color: (ipfsHash && randomAddress && address) ? 'white' : '#a0aec0',
                border: 'none',
                borderRadius: 8,
                fontSize: '1rem',
                fontWeight: 600,
                cursor: (ipfsHash && randomAddress && address) ? 'pointer' : 'not-allowed',
                boxShadow: (ipfsHash && randomAddress && address) ? '0 4px 12px rgba(79, 172, 254, 0.4)' : 'none',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (ipfsHash && randomAddress && address) && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              3️⃣ Save On-Chain
            </button>
          </div>

          {/* Status Info */}
          {(randomAddress || ipfsHash) && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#edf2f7',
              borderRadius: 8,
              fontSize: '0.875rem'
            }}>
              {randomAddress && (
                <div style={{ marginBottom: ipfsHash ? '0.5rem' : 0 }}>
                  <strong style={{ color: '#4a5568' }}>🔑 Encryption Address:</strong>{' '}
                  <code style={{
                    background: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 4,
                    color: '#667eea',
                    fontFamily: 'monospace'
                  }}>
                    {randomAddress}
                  </code>
                </div>
              )}
              {ipfsHash && (
                <div>
                  <strong style={{ color: '#4a5568' }}>📦 IPFS Hash:</strong>{' '}
                  <code style={{
                    background: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 4,
                    color: '#f5576c',
                    fontFamily: 'monospace'
                  }}>
                    {ipfsHash}
                  </code>
                </div>
              )}
            </div>
          )}
        </section>

        {/* My Images Section */}
        <section style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 1.5rem 0',
            fontSize: '1.5rem',
            color: '#1a202c',
            fontWeight: 600
          }}>
            🖼️ My Encrypted Images
          </h2>

          {!address ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#718096'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👛</div>
              <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Please connect your wallet</p>
              <p style={{ fontSize: '0.875rem' }}>Connect your wallet to view your encrypted images</p>
            </div>
          ) : loadingList ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#718096'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
              <p>Loading your images...</p>
            </div>
          ) : entries.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#718096'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No images yet</p>
              <p style={{ fontSize: '0.875rem' }}>Upload your first encrypted image above</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {entries.map((e, i) => {
                const previewUrl = decryptedUrls[i];
                return (
                  <div
                    key={i}
                    style={{
                      background: 'white',
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s',
                      border: '1px solid #e2e8f0'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                  >
                    {previewUrl ? (
                      <div style={{
                        width: '100%',
                        height: 200,
                        background: '#f7fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={previewUrl}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        height: 200,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '3rem'
                      }}>
                        🔒
                      </div>
                    )}
                    <div style={{ padding: '1rem' }}>
                      <div style={{
                        fontWeight: 600,
                        color: '#1a202c',
                        marginBottom: '0.5rem',
                        fontSize: '1rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {e.name}
                      </div>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: '#718096',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '1rem'
                      }}>
                        {e.ipfsHash}
                      </div>
                      <button
                        onClick={() => doDecryptAndShow(i)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: previewUrl ? '#48bb78' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        {previewUrl ? '✅ Decrypted - Click to View' : '🔓 Decrypt & View'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
