import { STORE_ID } from "@/lib/tenant";

export const runtime = "nodejs";

interface CheckoutResponse {
  errors?: Array<{ detail?: string }>;
  data?: { attributes?: { url?: string } };
}

export async function POST(req: Request) {
  const apiKey = process.env.LS_API_KEY;
  const storeId = process.env.LS_STORE_ID;
  const variantId = process.env.LS_PRO_VARIANT_ID;

  if (!apiKey || !storeId || !variantId) {
    return Response.json(
      {
        error:
          "Lemon Squeezy is not configured. Set LS_API_KEY, LS_STORE_ID, and LS_PRO_VARIANT_ID to enable checkout.",
      },
      { status: 400 }
    );
  }

  let body: { store_id?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const customerStoreId =
    typeof body.store_id === "number" || typeof body.store_id === "string"
      ? String(body.store_id)
      : String(STORE_ID);

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: "",
            custom: { store_id: customerStoreId },
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  });

  const json = (await res.json().catch(() => ({}))) as CheckoutResponse;

  if (!res.ok) {
    return Response.json(
      { error: json.errors?.[0]?.detail ?? "Failed to create checkout." },
      { status: 500 }
    );
  }

  const url = json.data?.attributes?.url;
  if (!url) {
    return Response.json(
      { error: "No checkout URL returned by Lemon Squeezy." },
      { status: 500 }
    );
  }

  return Response.json({ url });
}