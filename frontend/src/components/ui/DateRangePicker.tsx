import React from "react";
import { Calendar } from "lucide-react";
import { DatePreset } from "../../hooks/useDateRange";

interface DateRangePickerProps {
  preset: DatePreset;
  from: string;
  to: string;
  onChange: (preset: DatePreset, from?: string, to?: string) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  preset,
  from,
  to,
  onChange,
  className = "",
}) => {
  const presets: Array<{ id: DatePreset; label: string }> = [
    { id: "today", label: "Today" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div
      className={`flex flex-wrap items-center gap-2 p-1 bg-white border border-[#E8E3DA] rounded-lg shadow-none ${className}`}
    >
      <div className="flex items-center gap-1">
        {presets.map((p) => {
          const isActive = preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                isActive
                  ? "bg-[#795438] text-white"
                  : "text-[#88847D] hover:bg-[#F3EDE6] hover:text-[#292824]"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {preset === "custom" ? (
        <div className="flex items-center gap-2 pl-2 border-l border-[#E8E3DA]">
          <input
            type="date"
            value={from}
            onChange={(e) => onChange("custom", e.target.value, to)}
            className="px-2 py-1 text-xs border border-[#DDD6CA] rounded focus:outline-none focus:ring-1 focus:ring-[#795438] text-[#292824]"
          />
          <span className="text-xs text-[#88847D]">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onChange("custom", from, e.target.value)}
            className="px-2 py-1 text-xs border border-[#DDD6CA] rounded focus:outline-none focus:ring-1 focus:ring-[#795438] text-[#292824]"
          />
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-[#E8E3DA] text-[11px] font-medium text-[#88847D]">
          <Calendar className="w-3.5 h-3.5 text-[#A58B6F]" />
          <span>
            {from} &bull; {to}
          </span>
        </div>
      )}
    </div>
  );
};
