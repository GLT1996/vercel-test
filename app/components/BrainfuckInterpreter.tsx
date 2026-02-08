"use client";

import { useState } from 'react';

export function BrainfuckInterpreter() {
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const runBrainfuck = () => {
    setOutput('');
    setError('');
    
    let tape = new Uint8Array(30000).fill(0);
    let tapePointer = 0;
    let codePointer = 0;
    let inputPointer = 0;
    let result = '';
    
    const bracketMap: { [key: number]: number } = {};
    const bracketStack: number[] = [];

    // First pass: build bracket map for jumping
    for (let i = 0; i < code.length; i++) {
        if (code[i] === '[') {
            bracketStack.push(i);
        } else if (code[i] === ']') {
            if (bracketStack.length === 0) {
                setError(`Error: Unmatched ']' at position ${i}`);
                return;
            }
            const start = bracketStack.pop()!;
            bracketMap[start] = i;
            bracketMap[i] = start;
        }
    }

    if (bracketStack.length > 0) {
        setError(`Error: Unmatched '[' at position ${bracketStack[0]}`);
        return;
    }

    // Second pass: execute code
    while (codePointer < code.length) {
      const command = code[codePointer];

      switch (command) {
        case '>':
          tapePointer++;
          break;
        case '<':
          if (tapePointer > 0) {
            tapePointer--;
          }
          break;
        case '+':
          tape[tapePointer]++;
          break;
        case '-':
          tape[tapePointer]--;
          break;
        case '.':
          result += String.fromCharCode(tape[tapePointer]);
          break;
        case ',':
          if (inputPointer < input.length) {
            tape[tapePointer] = input.charCodeAt(inputPointer);
            inputPointer++;
          } else {
            tape[tapePointer] = 0; // EOF
          }
          break;
        case '[':
          if (tape[tapePointer] === 0) {
            codePointer = bracketMap[codePointer];
          }
          break;
        case ']':
          if (tape[tapePointer] !== 0) {
            codePointer = bracketMap[codePointer];
          }
          break;
        default:
          // Ignore non-command characters
          break;
      }
      codePointer++;
    }
    setOutput(result);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Brainfuck 解释器</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Brainfuck 代码
          </label>
          <textarea
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 block w-full h-64 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400"
            placeholder="在此输入 Brainfuck 代码, 例如: ++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++."
          />
        </div>
        <div>
          <label htmlFor="input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            输入 (Input for ',')
          </label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mt-1 block w-full h-64 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400"
            placeholder="在此输入程序需要的输入"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={runBrainfuck}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          运行
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="font-bold">错误:</p>
            <p>{error}</p>
        </div>
      )}

      <div className="mt-4">
        <label htmlFor="output" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          输出
        </label>
        <pre id="output" className="mt-1 block w-full h-32 p-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-600 overflow-auto">
          {output}
        </pre>
      </div>
    </div>
  );
}
