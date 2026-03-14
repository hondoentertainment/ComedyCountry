"use client";

import { useState, useEffect } from "react";

const CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK",
  "NZD", "SGD", "HKD", "KRW", "MXN", "BRL", "ZAR", "INR",
];

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("GBP");
  const [result, setResult] = useState<{
    converted: number;
    rate: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0 || from === to) {
      if (from === to) {
        setResult({ converted: numAmount || 0, rate: 1 });
      }
      return;
    }

    setLoading(true);
    setError(null);

    fetch(
      `/api/international/currency/convert?amount=${numAmount}&from=${from}&to=${to}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error("Conversion failed");
        return r.json();
      })
      .then((data) => setResult({ converted: data.converted, rate: data.rate }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [amount, from, to]);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h3 className="text-lg font-semibold text-white mb-4">
        Currency Converter
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Amount</label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">From</label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">To</label>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Converting...</p>}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && !loading && (
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-2xl font-bold text-white">
            {result.converted.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-gray-400 text-lg">{to}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            1 {from} = {result.rate.toFixed(4)} {to}
          </p>
        </div>
      )}
    </div>
  );
}
