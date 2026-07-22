export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const safeRequestHeaders = new Set([
  'accept',
  'accept-language',
  'content-type',
  'cookie',
  'idempotency-key',
  'x-correlation-id',
  'x-request-id'
]);

const relevantResponseHeaders = new Set(['content-type', 'set-cookie']);

const noStoreHeaders = {
  'cache-control': 'no-store, max-age=0',
  pragma: 'no-cache'
};

function readApiBaseUrl(): URL | Response {
  const rawBaseUrl = process.env.API_BASE_URL;
  if (!rawBaseUrl) return gatewayError(500, 'API_BASE_URL is not configured.');

  try {
    const baseUrl = new URL(rawBaseUrl);
    if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
      return gatewayError(500, 'API_BASE_URL must be an HTTP(S) URL.');
    }
    return baseUrl;
  } catch {
    return gatewayError(500, 'API_BASE_URL is malformed.');
  }
}

function buildUpstreamUrl(baseUrl: URL, pathSegments: string[], requestUrl: string): URL {
  const upstreamUrl = new URL(baseUrl.toString());
  const normalizedBasePath = upstreamUrl.pathname.endsWith('/') ? upstreamUrl.pathname.slice(0, -1) : upstreamUrl.pathname;
  const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join('/');
  upstreamUrl.pathname = `${normalizedBasePath}/${encodedPath}`;
  upstreamUrl.search = new URL(requestUrl).search;
  return upstreamUrl;
}

function buildRequestHeaders(headers: Headers): Headers {
  const forwardedHeaders = new Headers();
  headers.forEach((value, key) => {
    if (safeRequestHeaders.has(key.toLowerCase())) forwardedHeaders.set(key, value);
  });
  return forwardedHeaders;
}

function buildResponseHeaders(headers: Headers): Headers {
  const forwardedHeaders = new Headers(noStoreHeaders);
  headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (relevantResponseHeaders.has(normalizedKey)) forwardedHeaders.set(key, value);
  });
  forwardedHeaders.set('cache-control', noStoreHeaders['cache-control']);
  forwardedHeaders.set('pragma', noStoreHeaders.pragma);
  return forwardedHeaders;
}

function hasRequestBody(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD';
}

async function readRequestBody(request: Request): Promise<ArrayBuffer | undefined> {
  if (!hasRequestBody(request.method)) return undefined;
  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

function gatewayError(status: number, message: string): Response {
  return Response.json({ error: 'gateway_error', message }, { status, headers: noStoreHeaders });
}

async function proxyRequest(request: Request, context: RouteContext): Promise<Response> {
  const apiBaseUrl = readApiBaseUrl();
  if (apiBaseUrl instanceof Response) return apiBaseUrl;

  const { path } = await context.params;
  const upstreamUrl = buildUpstreamUrl(apiBaseUrl, path, request.url);

  try {
    const upstreamRequest: RequestInit = {
      method: request.method,
      headers: buildRequestHeaders(request.headers),
      cache: 'no-store',
      redirect: 'manual'
    };
    const requestBody = await readRequestBody(request);
    if (requestBody !== undefined) upstreamRequest.body = requestBody;

    const upstreamResponse = await fetch(upstreamUrl, upstreamRequest);

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: buildResponseHeaders(upstreamResponse.headers)
    });
  } catch {
    return gatewayError(502, 'The backend API is unavailable.');
  }
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function HEAD(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}
