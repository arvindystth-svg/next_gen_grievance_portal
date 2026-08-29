"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, MapPin } from "lucide-react";
import { BengaluruWard, formatWardLabel, searchWards, wardToArea } from "@/lib/bengaluruAreas";

interface WardAreaSelectorProps {
  value: { ward: string; zone: string; locality: string } | null;
  onChange: (area: { ward: string; zone: string; locality: string }) => void;
}

function formatSelectedValue(value: { ward: string; zone: string; locality: string }): string {
  return `${value.locality} · ${value.ward} (${value.zone})`;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export default function WardAreaSelector({ value, onChange }: WardAreaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchWards(query, 20), [query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (value && !open) {
      setQuery(formatSelectedValue(value));
    }
  }, [value, open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, results.length]);

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const preferredHeight = 280;
    const openBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(160, Math.min(preferredHeight, openBelow ? spaceBelow : spaceAbove));

    setDropdownPos({
      top: openBelow ? rect.bottom + 6 : rect.top - maxHeight - 6,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateDropdownPosition, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        document.getElementById("ward-area-portal")?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      if (value) {
        setQuery(formatSelectedValue(value));
      } else {
        setQuery("");
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

  const handleFocus = () => {
    setOpen(true);
    if (value) {
      setQuery("");
    }
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

  const dropdown =
    open &&
    dropdownPos &&
    mounted &&
    createPortal(
      <div
        id="ward-area-portal"
        className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        style={{
          position: "fixed",
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          zIndex: 9999,
        }}
      >
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-500">
            {query.trim()
              ? `${results.length} match${results.length === 1 ? "" : "es"} — ward no., locality, or area`
              : "Type ward number (e.g. 80), locality, or area name"}
          </p>
        </div>
        <ul
          id={listboxId}
          className="overflow-y-auto py-1"
          style={{ maxHeight: dropdownPos.maxHeight - 40 }}
          role="listbox"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400 text-center">
              No matches. Try &quot;151&quot;, &quot;Koramangala&quot;, or &quot;Whitefield&quot;.
            </li>
          ) : (
            results.map((ward, index) => {
              const isActive = index === highlightIndex;
              const isSelected =
                value?.ward === ward.name && value?.locality === ward.locality;
              const wardNumber = ward.name.match(/Ward\s+(\d+)/i)?.[1];

              return (
                <li key={`${ward.name}-${ward.locality}`} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectWard(ward)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-3 ${
                      isActive ? "bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-blue-50"
                    }`}
                  >
                    {wardNumber && (
                      <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                        {wardNumber}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="font-medium block truncate">{ward.locality}</span>
                      <span className="text-[11px] text-slate-500 truncate block">
                        {ward.name} · {ward.zone}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>,
      document.body
    );

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
        Ward &amp; Locality
      </label>
      <p className="text-[11px] text-slate-400 mb-2">
        Search by ward number, locality, or area name.
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
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 80, Koramangala, Whitefield…"
          className="w-full pl-9 pr-9 py-2.5 text-sm border-2 border-slate-200 rounded-xl bg-white hover:border-blue-300 focus:outline-none focus:border-blue-500 transition-colors text-slate-800 placeholder:text-slate-400"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
      </div>

      {dropdown}
    </div>
  );
}
