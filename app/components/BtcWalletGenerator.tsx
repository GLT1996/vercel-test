'use client';

import { useState } from 'react';
import { getPublicKey } from '@ethereum-cryptography/secp256k1';
import { utils } from '@ethereum-cryptography/utils';

export default function BtcWalletGenerator() {
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const generateWallet = () => {
    const privateKeyBytes = utils.randomBytes(32);
    const publicKeyBytes = getPublicKey(privateKeyBytes);
    
    setPrivateKey(utils.bytesToHex(privateKeyBytes));
    setPublicKey(utils.bytesToHex(publicKeyBytes));
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
    </div>
  );
}
