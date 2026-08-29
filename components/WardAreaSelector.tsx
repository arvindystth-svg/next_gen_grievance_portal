"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, MapPin } from "lucide-react";
import { wardOptions, parseWardOption } from "@/lib/bengaluruAreas";

interface WardAreaSelectorProps {
  value: { ward: string; zone: string; locality: string } | null;
  onChange: (area: { ward: string; zone: string; locality: string }) => void;
}

export default function WardAreaSelector({ value, onChange }: WardAreaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const options = wardOptions();

  const displayValue = value
    ? `${value.locality} · ${value.ward} (${value.zone})`
    : "";

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

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
        Ward &amp; Locality
      </label>
      <p className="text-xs text-slate-400 mb-2">
        Auto-filled from your complaint when possible. Search to change the affected area.
      </p>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl bg-white hover:border-blue-300 focus:outline-none focus:border-blue-500 transition-colors text-left min-h-[44px]"
      >
        <MapPin size={14} className="text-blue-500 flex-shrink-0" />
        <span className={`flex-1 truncate ${displayValue ? "text-slate-800 font-medium" : "text-slate-400"}`}>
          {displayValue || "Search ward or locality…"}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type locality or ward…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 text-center">No matching areas</li>
            ) : (
              filtered.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => {
                      const ward = parseWardOption(opt);
                      if (ward) {
                        onChange({
                          ward: ward.name,
                          zone: ward.zone,
                          locality: ward.locality,
                        });
                      }
                      setOpen(false);
                      setQuery("");
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors"
                  >
                    {opt}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
