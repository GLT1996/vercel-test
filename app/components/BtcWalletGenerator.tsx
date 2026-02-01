'use client';

import { useState } from 'react';
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js';
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils.js'; // Import hexToBytes
import { getRandomBytesSync } from 'ethereum-cryptography/random.js';
import { sha256 } from 'ethereum-cryptography/sha256.js';
import { ripemd160 } from 'ethereum-cryptography/ripemd160.js';
import bs58 from 'bs58';

export default function BtcWalletGenerator() {
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [inputPrivateKey, setInputPrivateKey] = useState<string>('0'.repeat(64)); // New state for input
  const [error, setError] = useState<string | null>(null); // New state for error messages

  // Helper function to derive public key and address from a given private key
  const deriveKeysAndAddress = (pkBytes: Uint8Array) => {
    try {
      setError(null); // Clear previous errors
      const newPublicKeyBytes = secp256k1.getPublicKey(pkBytes);
      
      // Address generation logic (same as before)
      const sha256Hash = sha256(newPublicKeyBytes);
      const ripemd160Hash = ripemd160(sha256Hash);
      const versionByte = new Uint8Array([0x00]);
      const payload = new Uint8Array(versionByte.length + ripemd160Hash.length);
      payload.set(versionByte);
      payload.set(ripemd160Hash, 1);
      const checksum = sha256(sha256(payload)).slice(0, 4);
      const addressBytes = new Uint8Array(payload.length + checksum.length);
      addressBytes.set(payload);
      addressBytes.set(checksum, payload.length);
      const address = bs58.encode(addressBytes);

      setPrivateKey(bytesToHex(pkBytes));
      setPublicKey(bytesToHex(newPublicKeyBytes));
      setWalletAddress(address);
    } catch (e: unknown) {
      setError(`Error deriving keys/address: ${e instanceof Error ? e.message : String(e)}`);
      setPrivateKey(null);
      setPublicKey(null);
      setWalletAddress(null);
    }
  };

  const generateRandomWallet = () => {
    const privateKeyBytes = getRandomBytesSync(32);
    deriveKeysAndAddress(privateKeyBytes);
    setInputPrivateKey(''); // Clear input field
  };

  const generateFromInput = () => {
    setError(null); // Clear previous errors
    if (!inputPrivateKey) {
      setError('Please enter a 256-bit private key in hexadecimal format.');
      return;
    }
    // Basic validation: ensure it's a hex string of length 64 (256 bits)
    if (!/^[0-9a-fA-F]{64}$/.test(inputPrivateKey)) {
      setError('Invalid private key format. Must be a 64-character hexadecimal string.');
      return;
    }

    try {
      const pkBytes = hexToBytes(inputPrivateKey);
      deriveKeysAndAddress(pkBytes);
    } catch (e: unknown) {
      setError(`Invalid private key: ${e instanceof Error ? e.message : String(e)}`);
      setPrivateKey(null);
      setPublicKey(null);
      setWalletAddress(null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={generateRandomWallet}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Generate Random Wallet
      </button>

      <div className="space-y-2">
        <h3 className="font-bold">Generate from your Private Key:</h3>
        <textarea
          className="w-full p-2 border rounded resize-none"
          rows={3}
          value={inputPrivateKey}
          onChange={(e) => setInputPrivateKey(e.target.value)}
          placeholder="Enter your 256-bit private key (hexadecimal)"
        />
        <button
          onClick={generateFromInput}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Generate from Input
        </button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {privateKey && (
        <div>
          <h3 className="font-bold">Private Key:</h3>
          <p className="break-all">{privateKey}</p>
        </div>
      )}
      {publicKey && (
        <div>
          <h3 className="font-bold">Public Key:</h3>
          <p className="break-all">{publicKey}</p>
        </div>
      )}
      {walletAddress && (
        <div>
          <h3 className="font-bold">Wallet Address:</h3>
          <p className="break-all">{walletAddress}</p>
        </div>
      )}
    </div>
  );
}
