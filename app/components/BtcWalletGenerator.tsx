'use client';

import { useState } from 'react';
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js';
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils.js';
import { sha256 } from 'ethereum-cryptography/sha256.js';
import { ripemd160 } from 'ethereum-cryptography/ripemd160.js';
import { bech32 } from 'bech32';
import * as bip39 from 'bip39';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory, BIP32Interface } from 'bip32';

const bip32 = BIP32Factory(ecc);

// 派生地址的类型定义
interface DerivedAddress {
  index: number;
  privateKey: string;
  publicKey: string;
  address: string;
}

export default function BtcWalletGenerator() {
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [inputPrivateKey, setInputPrivateKey] = useState<string>('0'.repeat(64)); // New state for input
  const [mnemonic, setMnemonic] = useState<string>('');
  const [error, setError] = useState<string | null>(null); // New state for error messages

  // 新增状态：派生地址列表和根节点
  const [derivedAddresses, setDerivedAddresses] = useState<DerivedAddress[]>([]);
  const [rootNode, setRootNode] = useState<BIP32Interface | null>(null);

  // 余额查询状态
  const [queryAddress, setQueryAddress] = useState<string>('');
  const [balanceInfo, setBalanceInfo] = useState<{
    address: string;
    balance: number;
    balanceBTC: string;
    totalReceived: number;
    totalSent: number;
    txCount: number;
  } | null>(null);
  const [queryLoading, setQueryLoading] = useState<boolean>(false);
  const [queryError, setQueryError] = useState<string | null>(null);

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

  // 从单个私钥派生地址信息（返回对象而非设置状态）
  const deriveAddressFromPrivateKey = (pkBytes: Uint8Array): { privateKey: string; publicKey: string; address: string } | null => {
    try {
      const compressedPublicKey = secp256k1.getPublicKey(pkBytes, true);
      const sha256Hash = sha256(compressedPublicKey);
      const ripemd160Hash = ripemd160(sha256Hash);
      const words = [0];
      const converted = bech32.toWords(ripemd160Hash);
      words.push(...converted);
      const address = bech32.encode('bc', words);

      return {
        privateKey: bytesToHex(pkBytes),
        publicKey: bytesToHex(compressedPublicKey),
        address
      };
    } catch {
      return null;
    }
  };

  // 从根节点派生多个地址
  const deriveMultipleAddresses = (root: BIP32Interface, count: number, startIndex: number = 0): DerivedAddress[] => {
    const addresses: DerivedAddress[] = [];

    for (let i = startIndex; i < startIndex + count; i++) {
      const child = root.derivePath(`m/84'/0'/0'/0/${i}`);
      if (child.privateKey) {
        const addressInfo = deriveAddressFromPrivateKey(child.privateKey);
        if (addressInfo) {
          addresses.push({
            index: i,
            ...addressInfo
          });
        }
      }
    }
    return addresses;
  };

  const generateRandomWallet = async () => {
    // 1. 使用 bip39 生成随机助记词（默认12个单词）
    const newMnemonic = bip39.generateMnemonic();
    setMnemonic(newMnemonic);

    // 2. 从助记词派生种子和根节点
    const seed = await bip39.mnemonicToSeed(newMnemonic);
    const root = bip32.fromSeed(seed);
    setRootNode(root);

    // 3. 默认生成前3个地址
    const addresses = deriveMultipleAddresses(root, 3, 0);
    setDerivedAddresses(addresses);

    // 4. 设置第一个地址为主显示
    if (addresses.length > 0) {
      setPrivateKey(addresses[0].privateKey);
      setPublicKey(addresses[0].publicKey);
      setWalletAddress(addresses[0].address);
    }

    setInputPrivateKey(''); // Clear input field
  };

  // 生成更多地址
  const generateMoreAddresses = () => {
    if (!rootNode) {
      setError('Please generate a wallet first.');
      return;
    }

    const startIndex = derivedAddresses.length;
    const newAddresses = deriveMultipleAddresses(rootNode, 3, startIndex);
    setDerivedAddresses([...derivedAddresses, ...newAddresses]);
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
      setRootNode(root);

      // 3. 默认生成前3个地址
      const addresses = deriveMultipleAddresses(root, 3, 0);
      setDerivedAddresses(addresses);

      // 4. 设置第一个地址为主显示
      if (addresses.length > 0) {
        setPrivateKey(addresses[0].privateKey);
        setPublicKey(addresses[0].publicKey);
        setWalletAddress(addresses[0].address);
      }
    } catch (e) {
      setError(`Error deriving from mnemonic: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // 查询地址余额
  const queryAddressBalance = async () => {
    setQueryError(null);
    setBalanceInfo(null);

    const address = queryAddress.trim();
    if (!address) {
      setQueryError('Please enter a BTC address.');
      return;
    }

    // 验证地址格式 (bc1, 1, 3 开头)
    if (!/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,}$/.test(address)) {
      setQueryError('Invalid BTC address format.');
      return;
    }

    setQueryLoading(true);

    // 带超时的 fetch 函数
    const fetchWithTimeout = async (url: string, timeout: number = 10000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // 多个 API 源，按优先级尝试
    const TIMEOUT = 10000; // 10秒超时
    const apis = [
      {
        name: 'mempool.space',
        fetch: async () => {
          const res = await fetchWithTimeout(`https://mempool.space/api/address/${address}`, TIMEOUT);
          const data = await res.json();
          const funded = data.chain_stats.funded_txo_sum || 0;
          const spent = data.chain_stats.spent_txo_sum || 0;
          return {
            balance: funded - spent,
            totalReceived: funded,
            totalSent: spent,
            txCount: data.chain_stats.tx_count || 0
          };
        }
      },
      {
        name: 'blockstream.info',
        fetch: async () => {
          const res = await fetchWithTimeout(`https://blockstream.info/api/address/${address}`, TIMEOUT);
          const data = await res.json();
          const funded = data.chain_stats.funded_txo_sum || 0;
          const spent = data.chain_stats.spent_txo_sum || 0;
          return {
            balance: funded - spent,
            totalReceived: funded,
            totalSent: spent,
            txCount: data.chain_stats.tx_count || 0
          };
        }
      },
      {
        name: 'blockcypher',
        fetch: async () => {
          const res = await fetchWithTimeout(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`, TIMEOUT);
          const data = await res.json();
          return {
            balance: data.balance || 0,
            totalReceived: data.total_received || 0,
            totalSent: data.total_sent || 0,
            txCount: data.n_tx || 0
          };
        }
      }
    ];

    let lastError: string | null = null;

    for (const api of apis) {
      try {
        const result = await api.fetch();
        setBalanceInfo({
          address: address,
          balance: result.balance,
          balanceBTC: (result.balance / 100000000).toFixed(8),
          totalReceived: result.totalReceived,
          totalSent: result.totalSent,
          txCount: result.txCount
        });
        setQueryLoading(false);
        return; // 成功则返回
      } catch (e) {
        const errorMsg = e instanceof Error && e.name === 'AbortError'
          ? 'timeout (10s)'
          : (e instanceof Error ? e.message : String(e));
        lastError = `${api.name}: ${errorMsg}`;
        console.warn(`API ${api.name} failed:`, e);
      }
    }

    // 所有 API 都失败
    setQueryError(`All APIs failed. Last error: ${lastError}`);
    setQueryLoading(false);
  };

  // 格式化 satoshi 为 BTC
  const formatSatoshi = (satoshi: number): string => {
    return (satoshi / 100000000).toFixed(8);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={generateRandomWallet}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Generate Random Wallet (with Mnemonic)
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

      {/* 余额查询区域 */}
      <div className="space-y-2 border-t pt-4 mt-4">
        <h3 className="font-bold">Query Address Balance:</h3>
        <textarea
          className="w-full p-2 border rounded resize-none"
          rows={2}
          value={queryAddress}
          onChange={(e) => setQueryAddress(e.target.value)}
          placeholder="Enter BTC address (bc1..., 1..., or 3...)"
        />
        <button
          onClick={queryAddressBalance}
          disabled={queryLoading}
          className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {queryLoading ? 'Querying...' : 'Query Balance'}
        </button>

        {queryError && <p className="text-red-500">{queryError}</p>}

        {balanceInfo && (
          <div className="bg-gray-100 p-3 rounded border">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-semibold">Address:</div>
              <div className="font-mono break-all">{balanceInfo.address}</div>

              <div className="font-semibold">Balance:</div>
              <div className="font-mono">
                {balanceInfo.balanceBTC} BTC
                <span className="text-gray-500 ml-2">({balanceInfo.balance.toLocaleString()} sat)</span>
              </div>

              <div className="font-semibold">Total Received:</div>
              <div className="font-mono">{formatSatoshi(balanceInfo.totalReceived)} BTC</div>

              <div className="font-semibold">Total Sent:</div>
              <div className="font-mono">{formatSatoshi(balanceInfo.totalSent)} BTC</div>

              <div className="font-semibold">Transactions:</div>
              <div className="font-mono">{balanceInfo.txCount}</div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {privateKey && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold">Mnemonic (Seed Phrase):</h3>
            <p className="break-all text-orange-600 font-medium">{mnemonic}</p>
            <p className="text-sm text-gray-500 mt-1">⚠️ Save this phrase securely! It can restore your wallet.</p>
          </div>
          <div>
            <h3 className="font-bold">Private Key:</h3>
            <p className="break-all">{privateKey}</p>
          </div>
          <div>
            <h3 className="font-bold">Public Key:</h3>
            <p className="break-all">{publicKey}</p>
          </div>
          <div>
            <h3 className="font-bold">Wallet Address:</h3>
            <p className="break-all">{walletAddress}</p>
          </div>
        </div>
      )}

      {/* 派生地址列表 */}
      {derivedAddresses.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold">Derived Addresses (HD Wallet):</h3>
          <p className="text-sm text-gray-500">
            All addresses below are derived from the same mnemonic using BIP84 path: m/84&apos;/0&apos;/0&apos;/0/[index]
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">Index</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Address</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Private Key</th>
                </tr>
              </thead>
              <tbody>
                {derivedAddresses.map((addr) => (
                  <tr key={addr.index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 font-mono">#{addr.index}</td>
                    <td className="border border-gray-300 px-3 py-2 font-mono text-sm break-all">{addr.address}</td>
                    <td className="border border-gray-300 px-3 py-2 font-mono text-xs break-all text-gray-600">{addr.privateKey}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={generateMoreAddresses}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Generate More Addresses
          </button>
        </div>
      )}
    </div>
  );
}
