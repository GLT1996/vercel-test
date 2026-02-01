'use client';

import { useState, ChangeEvent } from 'react';

type InputType = 'dec' | 'hex' | 'bin';

export default function DataConverter() {
  const [values, setValues] = useState({ dec: '', hex: '', bin: '' });

  const handleInputChange = (value: string, type: InputType) => {
    if (value === '') {
      setValues({ dec: '', hex: '', bin: '' });
      return;
    }

    let bigIntValue: bigint;

    try {
      switch (type) {
        case 'dec':
          if (!/^\d+$/.test(value)) return;
          bigIntValue = BigInt(value);
          break;
        case 'hex':
          if (!/^[0-9a-fA-F]+$/.test(value)) return;
          bigIntValue = BigInt('0x' + value);
          break;
        case 'bin':
          if (!/^[01]+$/.test(value)) return;
          bigIntValue = BigInt('0b' + value);
          break;
        default:
          return;
      }
    } catch {
      setValues({ dec: 'Error', hex: 'Error', bin: 'Error' });
      return;
    }
    
    setValues({
      dec: bigIntValue.toString(10),
      hex: bigIntValue.toString(16),
      bin: bigIntValue.toString(2),
    });
  };

  const createHandler = (type: InputType) => (e: ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e.target.value, type);
  };

  return (
    <div className="w-full max-w-lg p-4 bg-white dark:bg-zinc-900 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center text-zinc-800 dark:text-zinc-200">数据转换</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="decimal" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            十进制
          </label>
          <input
            type="text"
            id="decimal"
            value={values.dec}
            onChange={createHandler('dec')}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="例如: 10"
          />
        </div>
        <div>
          <label htmlFor="hexadecimal" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            十六进制
          </label>
          <input
            type="text"
            id="hexadecimal"
            value={values.hex}
            onChange={createHandler('hex')}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="例如: a"
          />
        </div>
        <div>
          <label htmlFor="binary" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            二进制
          </label>
          <input
            type="text"
            id="binary"
            value={values.bin}
            onChange={createHandler('bin')}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="例如: 1010"
          />
        </div>
      </div>
    </div>
  );
}
