"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

interface DepartmentSelectorProps {
  label: string;
  hint?: string;
  selected: string[];
  options: string[];
  onChange: (selected: string[]) => void;
  badgeClassName?: string;
  placeholder?: string;
}

export default function DepartmentSelector({
  label,
  hint,
  selected,
  options,
  onChange,
  badgeClassName = "bg-blue-100 text-blue-700 border-blue-200",
  placeholder = "Search departments…",
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

  const remove = (dept: string) => {
    onChange(selected.filter((d) => d !== dept));
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
        {label}
        {selected.length > 1 && (
          <span className="ml-1.5 text-[10px] font-bold text-blue-600 normal-case tracking-normal">
            ({selected.length} selected)
          </span>
        )}
      </label>
      {hint && <p className="text-xs text-slate-400 mb-2">{hint}</p>}

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((dept) => (
            <span
              key={dept}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border ${badgeClassName}`}
            >
              {dept}
              <button
                type="button"
                onClick={() => remove(dept)}
                className="hover:opacity-70 transition-opacity"
                aria-label={`Remove ${dept}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl bg-white hover:border-blue-300 focus:outline-none focus:border-blue-500 transition-colors text-left"
      >
        <Search size={14} className="text-slate-400 flex-shrink-0" />
        <span className="flex-1 text-slate-400 truncate">
          {selected.length === 0
            ? placeholder
            : "Search to add or remove departments…"}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Multi-select dropdown */}
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
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
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500">
              Tap items to toggle selection · {selected.length} department
              {selected.length !== 1 ? "s" : ""} chosen
            </div>
          )}
        </div>
      )}
    </div>
  );
}
