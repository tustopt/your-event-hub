import { DEFAULT_SOURCE_URL } from "../sources/cinema_ideal/fetcher";

async function main(): Promise<void> {
  const checkedAt = new Date();

  try {
    const response = await fetch(DEFAULT_SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; your-event-hub/1.0)" },
    });
    const html = await response.text();

    const scripts = [...html.matchAll(/<script[^>]+(?:src=["']([^"']+)["'])?[^>]*>/gi)]
      .map((m) => m[1])
      .filter(Boolean)
      .slice(0, 30);

    const links = [...html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)]
      .map((m) => m[1])
      .filter(Boolean)
      .slice(0, 30);

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    console.log(
      JSON.stringify(
        {
          checkedAt: checkedAt.toISOString(),
          ok: response.ok,
          status: response.status,
          contentType: response.headers.get("content-type"),
          finalUrl: response.url,
          bytes: Buffer.byteLength(html, "utf8"),
          title: (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim(),
          scripts,
          links,
          textSample: text.slice(0, 5000),
          htmlSample: html.slice(0, 5000),
        },
        null,
        2,
      ),
    );

    if (!response.ok) process.exitCode = 1;
  } catch (error) {
    console.error(
      JSON.stringify(
        { checkedAt: checkedAt.toISOString(), ok: false, error: String(error) },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}

main();
