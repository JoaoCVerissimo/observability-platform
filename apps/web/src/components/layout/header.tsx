import { useState } from "react";
import { cn } from "@/lib/utils";

const TIME_RANGES = ["15m", "1h", "6h", "24h", "7d"];

interface HeaderProps {
  title: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  children?: React.ReactNode;
}

export function Header({
  title,
  timeRange,
  onTimeRangeChange,
  children,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-4">
        {children}
        <div className="flex rounded-md border border-gray-700 overflow-hidden">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                timeRange === range
                  ? "bg-brand-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
