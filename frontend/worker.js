// None of this needs to exist, but then again the same can be said about Idena itself.
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
  })

  async function handleRequest(request) {
    // Add CORS headers
    let corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Change '*' to your specific origin if needed
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }

    // Handle CORS preflight request
    if (request.method === 'OPTIONS') {
      response = new Response(null, { status: 204 })
    } else if (request.method === 'POST') {
      const url = new URL(request.url)
      const path = url.pathname.split('/').pop()

      if (path === 'start-session' || path === 'getToken') {
        response = await handleStartSession(request)
      } else if (path === 'authenticate') {
        response = await handleAuthenticate(request)
      } else if (path === 'getSignature') {
        response = await handleGetSignature(request)
      } else {
        response = new Response('Not found', { status: 404 })
      }
    }

    // Modify the response to include CORS headers
    const modifiedHeaders = new Headers(response.headers)
    for (const [key, value] of Object.entries(corsHeaders)) {
      modifiedHeaders.set(key, value)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: modifiedHeaders,
    })
  }

  async function handleStartSession(request) {
    const body = await request.json()
    const { token, address } = body

    if (token && address) {
      const nonce = `signin-uwu`
      return jsonResponse({ success: true, data: { nonce } })
    } else {
      return jsonResponse({ success: false, error: 'Invalid input' })
    }
  }

  async function handleAuthenticate(request) {
    const body = await request.json()
    const { token, signature } = body

    if (token && signature) {
      IDENA_SIGNIN.put(token, signature)
      return jsonResponse({ success: true, data: { authenticated: true } })
    } else {
      return jsonResponse({ success: false, error: 'Invalid input' })
    }
  }

  async function handleGetSignature(request) {
    const body = await request.json()
    const { token } = body

    if (token) {
      const signature = await IDENA_SIGNIN.get(token)

      if (signature) {
        return jsonResponse({ success: true, signature: signature })
      } else {
        return jsonResponse({ success: false, error: 'Signature not found' })
      }
    } else {
      return jsonResponse({ success: false, error: 'Invalid input' })
    }
  }

  function jsonResponse(data) {
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  function generateRandomNonce() {
    return [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
  }

  async function handleOptions(request) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
    };
    if (
      request.headers.get("Origin") !== null &&
      request.headers.get("Access-Control-Request-Method") !== null &&
      request.headers.get("Access-Control-Request-Headers") !== null
    ) {
      // Handle CORS preflight requests.
      return new Response(null, {
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Headers": request.headers.get(
            "Access-Control-Request-Headers"
          ),
        },
      });
    } else {
      // Handle standard OPTIONS request.
      return new Response(null, {
        headers: {
          ...corsHeaders,
          Allow: "GET, HEAD, POST, OPTIONS",
        },
      });
    }
  }
