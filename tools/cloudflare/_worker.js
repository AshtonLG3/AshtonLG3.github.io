export default {
  async fetch(request, env) {
    const range = request.headers.get("Range");
    const match = range?.match(/^bytes=(\d*)-(\d*)$/i);

    if (request.method !== "GET" || !match || (!match[1] && !match[2])) {
      return env.ASSETS.fetch(request);
    }

    const headers = new Headers(request.headers);
    headers.delete("Range");
    const ifRange = headers.get("If-Range");
    headers.delete("If-Range");

    const asset = await env.ASSETS.fetch(new Request(request, { headers }));
    if (asset.status !== 200 || !asset.headers.get("Content-Type")?.startsWith("video/mp4")) {
      return asset;
    }
    if (ifRange && ifRange !== asset.headers.get("ETag") && ifRange !== asset.headers.get("Last-Modified")) {
      return asset;
    }

    const bytes = await asset.arrayBuffer();
    const size = bytes.byteLength;
    const start = match[1] ? Number(match[1]) : Math.max(size - Number(match[2]), 0);
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    const responseHeaders = new Headers(asset.headers);
    responseHeaders.delete("Content-Encoding");
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "no-store");

    if (start >= size || start > end) {
      responseHeaders.delete("Content-Length");
      responseHeaders.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers: responseHeaders });
    }

    const chunk = new Uint8Array(bytes, start, end - start + 1);
    responseHeaders.set("Content-Range", `bytes ${start}-${end}/${size}`);
    responseHeaders.set("Content-Length", String(chunk.byteLength));
    return new Response(chunk, { status: 206, headers: responseHeaders });
  }
};
