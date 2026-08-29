"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, MapPin } from "lucide-react";
import { BengaluruWard, formatWardLabel, searchWards, wardToArea } from "@/lib/bengaluruAreas";

interface WardAreaSelectorProps {
  value: { ward: string; zone: string; locality: string } | null;
  onChange: (area: { ward: string; zone: string; locality: string }) => void;
}

function formatSelectedValue(value: { ward: string; zone: string; locality: string }): string {
  return `${value.locality} · ${value.ward} (${value.zone})`;
}

export default function WardAreaSelector({ value, onChange }: WardAreaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchWards(query, 15), [query]);

  useEffect(() => {
    if (value && !open && !query) {
      setQuery(formatSelectedValue(value));
    }
  }, [value, open, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, results.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (value) {
          setQuery(formatSelectedValue(value));
        } else {
          setQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const selectWard = (ward: BengaluruWard) => {
    const area = wardToArea(ward);
    onChange(area);
    setQuery(formatWardLabel(ward));
    setOpen(false);
  };

  const handleInputChange = (next: string) => {
    setQuery(next);
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && results[highlightIndex]) {
      e.preventDefault();
      selectWard(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      if (value) setQuery(formatSelectedValue(value));
    }
  };

  const listboxId = "ward-area-listbox";

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
        Ward &amp; Locality
      </label>
      <p className="text-xs text-slate-400 mb-2">
        Auto-filled from your complaint when possible. Type to search across 160+ BBMP wards and localities.
      </p>

      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <MapPin
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Type locality, ward number, or area name…"
          className="w-full pl-9 pr-9 py-2.5 text-sm border-2 border-slate-200 rounded-xl bg-white hover:border-blue-300 focus:outline-none focus:border-blue-500 transition-colors text-slate-800 placeholder:text-slate-400"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
      </div>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
            <p className="text-[11px] text-slate-500">
              {query.trim()
                ? `${results.length} matching ward${results.length === 1 ? "" : "s"}`
                : "Popular areas — start typing to narrow down"}
            </p>
          </div>
          <ul id={listboxId} className="max-h-60 overflow-y-auto py-1" role="listbox">
            {results.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 text-center">
                No matching wards. Try a locality like Koramangala, Hebbal, or Whitefield.
              </li>
            ) : (
              results.map((ward, index) => {
                const isActive = index === highlightIndex;
                const isSelected =
                  value?.ward === ward.name && value?.locality === ward.locality;

                return (
                  <li key={`${ward.name}-${ward.locality}`} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => selectWard(ward)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-900"
                          : "text-slate-700 hover:bg-blue-50"
                      }`}
                    >
                      <span className="font-medium block">{ward.locality}</span>
                      <span className="text-xs text-slate-500">
                        {ward.name} · {ward.zone}
                      </span>
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
