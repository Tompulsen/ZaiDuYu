import https from "https";
import http from "http";
import { URL } from "url";

/**
 * Custom fetch that forces HTTP/3.0 (QUIC over UDP)
 * Falls back to HTTP/1.1 if HTTP/3 is not supported
 * Uses Node.js native https/http module with ALPN negotiation
 */
export async function fetchHttp1(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === "https:";
  const transport = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const reqOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers as Record<string, string>,
      // HTTP/3.0 (QUIC) with fallback to HTTP/1.1
      // h3-29 = HTTP/3 draft-29
      // h3-Q050 = HTTP/3 Q050
      // h3 = HTTP/3
      // h3-28, h3-27 = older HTTP/3 drafts
      // http/1.1 = fallback
      ALPNProtocols: ["h3", "h3-29", "h3-Q050", "h3-28", "h3-27", "http/1.1"],
      // Keep-alive connection
      keepAlive: true,
      // Timeout
      timeout: 10 * 60 * 1000,
    };

    const req = transport.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];

      res.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks);
        const headers = new Headers();
        if (res.headers) {
          Object.entries(res.headers).forEach(([key, value]) => {
            if (value !== undefined) {
              headers.set(key, Array.isArray(value) ? value.join(", ") : value);
            }
          });
        }

        resolve(
          new Response(body, {
            status: res.statusCode || 200,
            statusText: res.statusMessage || "OK",
            headers,
          }),
        );
      });

      res.on("error", reject);
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    // Handle abort signal
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        req.destroy();
        reject(new DOMException("Aborted", "AbortError"));
      });
    }

    // Write body if present
    if (options.body) {
      if (options.body instanceof ReadableStream) {
        // Handle streaming body
        const reader = options.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              req.end();
              break;
            }
            req.write(value);
          }
        };
        pump().catch(reject);
      } else if (typeof options.body === "string") {
        req.write(options.body);
        req.end();
      } else if (Buffer.isBuffer(options.body)) {
        req.write(options.body);
        req.end();
      } else {
        req.end();
      }
    } else {
      req.end();
    }
  });
}

/**
 * Smart fetch: uses HTTP/3.0 for external APIs, standard fetch for same-origin
 */
export async function smartFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  // Use HTTP/3.0 for external HTTPS URLs
  if (url.startsWith("https://")) {
    return fetchHttp1(url, options);
  }
  // Use standard fetch for HTTP or same-origin requests
  return fetch(url, options);
}
