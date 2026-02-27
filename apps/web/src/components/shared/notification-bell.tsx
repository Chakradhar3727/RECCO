"use client";

import { useState } from "react";
import { Bell, X, Check, AlertCircle, Info } from "lucide-react";

interface Notification {
    id: string;
    title: string;
    body: string;
    type?: "info" | "success" | "warning" | "error";
    isRead?: boolean;
    createdAt?: string;
}

interface NotificationBellProps {
    notifications?: Notification[];
    unreadCount?: number;
    onMarkRead?: (id: string) => void;
    onMarkAllRead?: () => void;
}

export function NotificationBell({
    notifications = [],
    unreadCount = 0,
    onMarkRead,
    onMarkAllRead,
}: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);

    const typeIcon = {
        info: <Info size={14} className="text-recco-teal-700" />,
        success: <Check size={14} className="text-recco-green-700" />,
        warning: <AlertCircle size={14} className="text-recco-amber-700" />,
        error: <X size={14} className="text-recco-red-700" />,
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-recco-gray-50 transition-colors text-recco-navy-900"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-recco-red-700 text-white text-[10px] font-bold px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border shadow-xl bg-white z-50">
                        <div className="sticky top-0 flex items-center justify-between p-3 border-b bg-white">
                            <h3 className="font-bold text-recco-navy-900 text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={onMarkAllRead}
                                    className="text-xs text-recco-green-700 font-medium hover:underline"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-recco-navy-900/40 text-sm">
                                No notifications
                            </div>
                        ) : (
                            <div className="divide-y">
                                {notifications.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => onMarkRead?.(n.id)}
                                        className={`w-full text-left p-3 hover:bg-recco-gray-50 transition-colors ${!n.isRead ? "bg-recco-green-100/30" : ""
                                            }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {typeIcon[n.type || "info"]}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-recco-navy-900 truncate">
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-recco-navy-900/60 line-clamp-2 mt-0.5">
                                                    {n.body}
                                                </p>
                                            </div>
                                            {!n.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-recco-green-700 shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
