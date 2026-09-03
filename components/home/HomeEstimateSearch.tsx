"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { captureAttribution } from "@/lib/analytics";
import {
  classifyFreeText,
  matchingMarkets,
  normalizeMarketInput,
  type MarketSearchRecord,
} from "./marketSearch";

type AddressSuggestion = {
  kind: "address";
  placeId: string;
  label: string;
};

type MarketSuggestion = {
  kind: "market";
  slug: string;
  label: string;
};

type Suggestion = AddressSuggestion | MarketSuggestion;

type SelectedLocation =
  | MarketSuggestion
  | (AddressSuggestion & { formattedAddress: string; zip: string | null });

const PREFILL_COOKIE = "curbio_market_prefill";

function newSessionToken(): string {
  return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function asMarketSuggestion(market: MarketSearchRecord): MarketSuggestion {
  return { kind: "market", slug: market.slug, label: market.label };
}

export function HomeEstimateSearch() {
  const [value, setValue] = useState("");
  const [addresses, setAddresses] = useState<AddressSuggestion[]>([]);
  const [selected, setSelected] = useState<SelectedLocation | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const sessionToken = useRef("");
  const listboxId = useId();

  useEffect(() => {
    // Load-bearing for the homepage → market-page hop: persist current UTMs
    // into the existing attribution store before navigation removes them.
    captureAttribution();
  }, []);

  const markets = useMemo(
    () => matchingMarkets(value).map(asMarketSuggestion),
    [value]
  );
  const suggestions: Suggestion[] = [...markets, ...addresses].slice(0, 7);

  useEffect(() => {
    const query = normalizeMarketInput(value);
    if (query.length < 3 || selected) {
      setAddresses([]);
      return;
    }

    if (!sessionToken.current) sessionToken.current = newSessionToken();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input: value, sessionToken: sessionToken.current }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          suggestions?: { placeId?: string; label?: string }[];
        };
        setAddresses(
          (data.suggestions ?? [])
            .filter((item): item is { placeId: string; label: string } =>
              Boolean(item.placeId && item.label)
            )
            .map((item) => ({ kind: "address", ...item }))
        );
        setOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setAddresses([]);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selected, value]);

  function storePrefill(prefill: { input: string; zip?: string; address?: string }) {
    document.cookie = `${PREFILL_COOKIE}=${encodeURIComponent(JSON.stringify(prefill))}; path=/markets; max-age=120; samesite=lax`;
  }

  async function routeFromZip(zip: string, address?: string) {
    const response = await fetch(`/api/resolve?zip=${encodeURIComponent(zip)}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("We could not check that location right now.");
    const result = (await response.json()) as { slug?: string | null };
    storePrefill({ input: value.trim(), zip, ...(address ? { address } : {}) });
    window.location.assign(result.slug ? `/markets/${result.slug}` : "/markets");
  }

  async function choose(suggestion: Suggestion) {
    setMessage("");
    setValue(suggestion.label);
    setOpen(false);
    if (suggestion.kind === "market") {
      setSelected(suggestion);
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/places/details", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken: sessionToken.current,
        }),
      });
      if (!response.ok) throw new Error("Address lookup is temporarily unavailable.");
      const detail = (await response.json()) as { formattedAddress?: string; zip?: string | null };
      const formattedAddress = detail.formattedAddress?.trim() || suggestion.label;
      setValue(formattedAddress);
      setSelected({ ...suggestion, formattedAddress, zip: detail.zip ?? null });
      sessionToken.current = "";
    } catch (error) {
      setSelected(null);
      setMessage(error instanceof Error ? error.message : "Address lookup is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !value.trim()) return;
    setPending(true);
    setMessage("");

    try {
      if (selected?.kind === "market") {
        storePrefill({ input: value.trim() });
        window.location.assign(`/markets/${selected.slug}`);
        return;
      }
      if (selected?.kind === "address") {
        if (selected.zip) {
          await routeFromZip(selected.zip, selected.formattedAddress);
        } else {
          storePrefill({ input: selected.formattedAddress, address: selected.formattedAddress });
          window.location.assign("/markets");
        }
        return;
      }

      const fallback = classifyFreeText(value);
      if (fallback.kind === "market") {
        storePrefill({ input: value.trim() });
        window.location.assign(`/markets/${fallback.slug}`);
        return;
      }
      if (fallback.kind === "zip") {
        const isAddress = /^\s*\d+\s+\S+/.test(value);
        await routeFromZip(fallback.zip, isAddress ? value.trim() : undefined);
        return;
      }

      storePrefill({ input: value.trim() });
      window.location.assign("/markets");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
      setPending(false);
    }
  }

  return (
    <form className="c-hero-form" onSubmit={submit} noValidate>
      <label className="c-hero-formlabel" htmlFor="c-market-search">
        Enter your ZIP, market, or address to reach your local manager
      </label>
      <div className="c-estimate-combobox">
        <div className="c-hero-search">
          <input
            id="c-market-search"
            type="text"
            placeholder="ZIP, market, or address"
            autoComplete="off"
            value={value}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listboxId}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onChange={(event) => {
              setValue(event.target.value);
              setSelected(null);
              setOpen(true);
              setMessage("");
            }}
          />
          <button type="submit" disabled={pending || !value.trim()}>
            {pending ? "Finding your team…" : "Get free estimate"}
          </button>
        </div>
        {open && suggestions.length > 0 && (
          <ul className="c-estimate-suggestions" id={listboxId} role="listbox">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.kind === "market" ? suggestion.slug : suggestion.placeId}
                role="option"
                aria-selected={false}
              >
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(suggestion)}>
                  <span>{suggestion.label}</span>
                  <small>{suggestion.kind === "market" ? "Curbio market" : "Address"}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {message && <p className="c-estimate-message" role="status">{message}</p>}
    </form>
  );
}
