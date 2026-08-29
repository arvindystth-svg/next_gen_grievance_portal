"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Check, MapPin } from "lucide-react";
import { BengaluruWard, searchWards, wardToArea } from "@/lib/bengaluruAreas";

export interface WardAreaValue {
  ward: string;
  zone: string;
  locality: string;
}

interface WardAreaSelectorProps {
  value: WardAreaValue | null;
  onChange: (area: WardAreaValue | null) => void;
  compact?: boolean;
  hideLabel?: boolean;
}

function formatSelectedValue(value: WardAreaValue): string {
  return `${value.locality} · ${value.ward} (${value.zone})`;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export default function WardAreaSelector({
  value,
  onChange,
  compact = false,
  hideLabel = false,
}: WardAreaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const results = useMemo(() => searchWards(query, 20), [query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, results.length]);

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
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
      setQuery("");
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectWard = (ward: BengaluruWard) => {
    const area = wardToArea(ward);
    const isSame = value?.ward === area.ward && value?.locality === area.locality;
    if (!isSame) {
      onChange(area);
    }
    setQuery("");
    setOpen(false);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[highlightIndex]) {
      e.preventDefault();
      selectWard(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
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
        <div className="p-2 border-b border-slate-100">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type ward number, locality, or area…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            autoFocus
            autoComplete="off"
          />
        </div>
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
          style={{ maxHeight: dropdownPos.maxHeight - 88 }}
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
                      isSelected
                        ? "bg-blue-50 text-blue-800 cursor-default"
                        : isActive
                        ? "bg-blue-50 text-blue-900"
                        : "text-slate-700 hover:bg-blue-50"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check size={10} className="text-white" />}
                    </span>
                    {wardNumber && (
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
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
      {!hideLabel && (
        <>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Ward &amp; Locality
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Search by ward number, locality, or area name.
          </p>
        </>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 text-sm border-2 border-slate-200 rounded-xl bg-white hover:border-blue-300 focus:outline-none focus:border-blue-500 transition-colors text-left ${
          compact ? "px-2.5 py-2 min-h-[38px]" : "px-3 py-2.5 min-h-[44px]"
        }`}
      >
        <Search size={14} className="text-slate-400 flex-shrink-0" />
        <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
          {!value ? (
            <span className="text-slate-400">e.g. 80, Koramangala, Whitefield…</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border max-w-full bg-blue-100 text-blue-700 border-blue-200">
              <MapPin size={10} className="flex-shrink-0" />
              <span className="truncate">{formatSelectedValue(value)}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={clearSelection}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") clearSelection(e as unknown as React.MouseEvent);
                }}
                className="hover:opacity-70 flex-shrink-0"
                aria-label="Clear selected ward"
              >
                <X size={10} />
              </span>
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {dropdown}
    </div>
  );
}
