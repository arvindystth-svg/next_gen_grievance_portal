"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

interface DepartmentSelectorProps {
  label: string;
  hint?: string;
  selected: string[];
  options: string[];
  onChange: (selected: string[]) => void;
  chipClassName?: string;
  placeholder?: string;
  compact?: boolean;
}

export default function DepartmentSelector({
  label,
  hint,
  selected,
  options,
  onChange,
  chipClassName = "bg-blue-100 text-blue-700 border-blue-200",
  placeholder = "Search departments…",
  compact = false,
}: DepartmentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (dept: string) => {
    if (selected.includes(dept)) {
      onChange(selected.filter((d) => d !== dept));
    } else {
      onChange([...selected, dept]);
    }
  };

  const remove = (dept: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((d) => d !== dept));
  };

  return (
    <div ref={containerRef} className="relative">
      <label
        className={`font-semibold text-slate-500 uppercase tracking-wider block ${
          compact ? "text-[10px] mb-1" : "text-xs mb-2"
        }`}
      >
        {label}
      </label>
      {hint && !compact && <p className="text-xs text-slate-400 mb-2">{hint}</p>}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 text-sm border-2 border-slate-200 rounded-xl bg-white hover:border-blue-300 focus:outline-none focus:border-blue-500 transition-colors text-left ${
          compact ? "px-2.5 py-2 min-h-[38px]" : "px-3 py-2.5 min-h-[44px]"
        }`}
      >
        <Search size={14} className="text-slate-400 flex-shrink-0" />
        <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
          {selected.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            selected.map((dept) => (
              <span
                key={dept}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border max-w-full ${chipClassName}`}
              >
                <span className="truncate">{dept}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => remove(dept, e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") remove(dept, e as unknown as React.MouseEvent);
                  }}
                  className="hover:opacity-70 flex-shrink-0"
                  aria-label={`Remove ${dept}`}
                >
                  <X size={10} />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 text-center">
                No matching departments
              </li>
            ) : (
              filtered.map((dept) => {
                const isSelected = selected.includes(dept);
                return (
                  <li key={dept}>
                    <button
                      type="button"
                      onClick={() => toggle(dept)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-blue-800"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={10} className="text-white" />}
                      </span>
                      <span className="flex-1">{dept}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
