"use client";

import { useState } from "react";
import { LinkIcon, Copy, Check, ExternalLink } from "lucide-react";

interface BlockchainBadgeProps {
    txHash?: string;
    contractAddress?: string;
    tokenId?: string;
    explorerUrl?: string;
}

export function BlockchainBadge({
    txHash,
    contractAddress,
    tokenId,
    explorerUrl = "https://amoy.polygonscan.com",
}: BlockchainBadgeProps) {
    const [copied, setCopied] = useState(false);

    const displayHash = txHash
        ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
        : "Not recorded";

    const copyHash = async () => {
        if (!txHash) return;
        await navigator.clipboard.writeText(txHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const fullUrl = txHash ? `${explorerUrl}/tx/${txHash}` : undefined;

    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-700/10 border border-purple-700/20">
            <LinkIcon size={14} className="text-purple-700 shrink-0" />
            <span className="text-sm font-mono text-purple-700 font-medium">
                {displayHash}
            </span>
            {tokenId && (
                <span className="text-xs text-purple-700/60">
                    #{tokenId}
                </span>
            )}
            {txHash && (
                <div className="flex items-center gap-1 ml-1">
                    <button
                        onClick={copyHash}
                        className="p-0.5 rounded hover:bg-purple-700/10 transition-colors text-purple-700/60 hover:text-purple-700"
                        title="Copy hash"
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    {fullUrl && (
                        <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0.5 rounded hover:bg-purple-700/10 transition-colors text-purple-700/60 hover:text-purple-700"
                            title="View on explorer"
                        >
                            <ExternalLink size={12} />
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
