'use client';

import { useState } from 'react';
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js';
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils.js';
import { getRandomBytesSync } from 'ethereum-cryptography/random.js';
import { sha256 } from 'ethereum-cryptography/sha256.js';
import { ripemd160 } from 'ethereum-cryptography/ripemd160.js';
import { bech32 } from 'bech32';
import * as bip39 from 'bip39';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';

const bip32 = BIP32Factory(ecc);

export default function BtcWalletGenerator() {
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [inputPrivateKey, setInputPrivateKey] = useState<string>('0'.repeat(64)); // New state for input
  const [mnemonic, setMnemonic] = useState<string>('');
  const [error, setError] = useState<string | null>(null); // New state for error messages

  // Helper function to derive public key and address from a given private key
  const deriveKeysAndAddress = (pkBytes: Uint8Array) => {
    try {
      setError(null); // Clear previous errors
      // Use compressed public key (33 bytes) for SegWit addresses
      const compressedPublicKey = secp256k1.getPublicKey(pkBytes, true);

      // SegWit P2WPKH address generation (bc1 prefix)
      // 1. SHA256 → RIPEMD160 to get the witness program (20 bytes)
      const sha256Hash = sha256(compressedPublicKey);
      const ripemd160Hash = ripemd160(sha256Hash);

      // 2. Convert to 5-bit words for Bech32 encoding
      const words = [0]; // witness version 0
      const converted = bech32.toWords(ripemd160Hash);
      words.push(...converted);

      // 3. Bech32 encode with "bc" HRP (Human Readable Part) for mainnet
      const address = bech32.encode('bc', words);

      setPrivateKey(bytesToHex(pkBytes));
      setPublicKey(bytesToHex(compressedPublicKey));
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

  const generateFromMnemonic = async () => {
    setError(null);

    // 验证助记词
    if (!bip39.validateMnemonic(mnemonic.trim())) {
      setError('Invalid mnemonic. Please check your seed phrase.');
      return;
    }

    try {
      // 1. 助记词 -> 种子
      const seed = await bip39.mnemonicToSeed(mnemonic.trim());

      // 2. 种子 -> HD 钱包根节点
      const root = bip32.fromSeed(seed);

      // 3. 派生路径: m/84'/0'/0'/0/0 (BIP84 for Native SegWit bc1地址)
      const child = root.derivePath("m/84'/0'/0'/0/0");

      // 4. 获取私钥
      const privateKeyBytes = child.privateKey;
      if (!privateKeyBytes) {
        throw new Error('Failed to derive private key');
      }

      // 5. 使用现有的 deriveKeysAndAddress 函数
      deriveKeysAndAddress(privateKeyBytes);
    } catch (e) {
      setError(`Error deriving from mnemonic: ${e instanceof Error ? e.message : String(e)}`);
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

      <div className="space-y-2">
        <h3 className="font-bold">Generate from Mnemonic (Seed Phrase):</h3>
        <textarea
          className="w-full p-2 border rounded resize-none"
          rows={3}
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          placeholder="Enter your 12/24 word seed phrase (separated by spaces)"
        />
        <button
          onClick={generateFromMnemonic}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Generate from Mnemonic
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
