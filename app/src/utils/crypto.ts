export async function deriveAesKeyFromAddress(address: string): Promise<CryptoKey> {
  // Normalize to lowercase without 0x
  const hex = address.toLowerCase().replace(/^0x/, '');
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  // Derive 32-byte key via SHA-256(address)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptBytes(data: Uint8Array, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data.buffer)
  );
  return { iv, ciphertext };
}

export async function decryptBytes(ciphertext: Uint8Array, key: CryptoKey, iv: Uint8Array) {
  const plain = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext.buffer)
  );
  return plain;
}

