"use client";
import 'setimmediate';
import { useState } from 'react';
import { simpleParser, ParsedMail } from 'mailparser';
import { Buffer } from 'buffer';

export default function EmlViewer() {
    const [mailData, setMailData] = useState<ParsedMail | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const buffer = await file.arrayBuffer();
            const mail = await simpleParser(Buffer.from(buffer));
            console.log("Parsed Mail data:", mail);
            setError(null);
            setMailData(mail);
        } catch (err) {
            console.error("Failed to parse EML file:", err);
            setError("无法解析EML文件。请确保文件格式正确。");
            setMailData(null);
        }
    };

    const renderAttachments = () => {
        if (!mailData?.attachments || mailData.attachments.length === 0) {
            return <p>无附件</p>;
        }

        return (
            <ul>
                {mailData.attachments.map((att, index) => {
                    const blob = new Blob([att.content], { type: att.contentType });
                    const url = URL.createObjectURL(blob);
                    return (
                        <li key={index} className="mb-2">
                            <a href={url} download={att.filename} className="text-blue-500 hover:underline">
                                {att.filename} ({Math.round(att.size / 1024)} KB)
                            </a>
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-center">EML 文件查看器</h1>
            <div className="mb-6">
                <label htmlFor="eml-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    上传 .eml 文件
                </label>
                <input
                    id="eml-upload"
                    type="file"
                    accept=".eml"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300"
                />
            </div>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            {mailData && (
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
                    <h2 className="text-xl font-semibold mb-3 border-b pb-2">邮件详情</h2>
                    <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 text-sm mb-4">
                        <strong className="text-gray-600 dark:text-gray-400">主题:</strong>
                        <span>{mailData.subject || '无主题'}</span>
                        <strong className="text-gray-600 dark:text-gray-400">发件人:</strong>
                        <span>{mailData.from?.text || 'N/A'}</span>
                        <strong className="text-gray-600 dark:text-gray-400">收件人:</strong>
                        <span>{mailData.to?.text || 'N/A'}</span>
                        <strong className="text-gray-600 dark:text-gray-400">日期:</strong>
                        <span>{mailData.date ? mailData.date.toLocaleString() : 'N/A'}</span>
                    </div>

                    <h3 className="text-lg font-semibold mt-4 mb-2 border-b pb-1">邮件正文</h3>
                    <div className="prose dark:prose-invert max-w-none p-2 border rounded bg-gray-50 dark:bg-gray-700">
                        {mailData.html ? (
                            <iframe
                                srcDoc={mailData.html}
                                sandbox="allow-same-origin"
                                className="w-full h-96 border-0"
                                title="Email Content"
                            />
                        ) : (
                            <pre className="whitespace-pre-wrap">{mailData.text || '邮件正文为空'}</pre>
                        )}
                    </div>
                    
                    <h3 className="text-lg font-semibold mt-4 mb-2 border-b pb-1">附件</h3>
                    <div className="p-2 border rounded bg-gray-50 dark:bg-gray-700">
                        {renderAttachments()}
                    </div>
                </div>
            )}
        </div>
    );
}
