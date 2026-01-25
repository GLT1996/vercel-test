'use client';

import { useState } from 'react';
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js';
import { bytesToHex } from 'ethereum-cryptography/utils.js';
import { getRandomBytesSync } from 'ethereum-cryptography/random.js';
import { sha256 } from 'ethereum-cryptography/sha256.js';
import { ripemd160 } from 'ethereum-cryptography/ripemd160.js';
import bs58 from 'bs58';

export default function BtcWalletGenerator() {
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const generateWallet = () => {
    const privateKeyBytes = getRandomBytesSync(32);
    const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes);
    
    // Address generation
    const sha256Hash = sha256(publicKeyBytes);
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

    setPrivateKey(bytesToHex(privateKeyBytes));
    setPublicKey(bytesToHex(publicKeyBytes));
    setWalletAddress(address);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={generateWallet}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Generate Wallet
      </button>
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
