import { NextResponse } from "next/server";
import {
  convertCurrency,
  getConversionTable,
  getStripeSupportedCurrencies,
  formatCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/currency";

/**
 * GET /api/international/currencies
 *
 * Query params:
 * - view: "list" | "convert" | "table" | "stripe" (default: "list")
 * - from: source currency code (for convert/table)
 * - to: target currency code (for convert)
 * - amount: amount to convert (for convert/table, default: 1)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "list";

    // List all supported currencies
    if (view === "list") {
      return NextResponse.json({
        currencies: SUPPORTED_CURRENCIES.map((c) => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol,
          decimals: c.decimals,
          stripeSupported: c.stripeSupported,
        })),
      });
    }

    // Stripe-supported currencies only
    if (view === "stripe") {
      const supported = getStripeSupportedCurrencies();
      return NextResponse.json({
        currencies: supported.map((c) => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol,
          decimals: c.decimals,
          minAmount: c.stripeMinAmount / Math.pow(10, c.decimals),
          minAmountFormatted: formatCurrency(
            c.stripeMinAmount / Math.pow(10, c.decimals),
            c.code,
          ),
        })),
      });
    }

    // Convert a specific amount
    if (view === "convert") {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const amountStr = searchParams.get("amount") || "1";

      if (!from || !to) {
        return NextResponse.json(
          { error: "'from' and 'to' currency codes are required" },
          { status: 400 },
        );
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json(
          { error: "amount must be a positive number" },
          { status: 400 },
        );
      }

      const result = await convertCurrency(amount, from, to);
      return NextResponse.json(result);
    }

    // Conversion table from one currency to all others
    if (view === "table") {
      const from = searchParams.get("from");
      const amountStr = searchParams.get("amount") || "1";

      if (!from) {
        return NextResponse.json(
          { error: "'from' currency code is required" },
          { status: 400 },
        );
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json(
          { error: "amount must be a positive number" },
          { status: 400 },
        );
      }

      const table = await getConversionTable(from, amount);
      return NextResponse.json({ baseCurrency: from, amount, conversions: table });
    }

    return NextResponse.json(
      { error: "Invalid view. Use: list, convert, table, or stripe" },
      { status: 400 },
    );
  } catch (error) {
    console.error("GET /api/international/currencies error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process currency request" },
      { status: 500 },
    );
  }
}
