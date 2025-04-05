addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
  
  if (url.pathname === '/save-config') {
    const formData = await request.formData()
    const config = {
      apiUrl: formData.get('apiUrl'),
      moduleName: formData.get('moduleName'),
      apiKeys: formData.getAll('apiKeys').filter(key => key.trim() !== '')
    }
    
    await KEY_STORE.put('config', JSON.stringify(config))
    return Response.redirect(url.origin, 302)
  }
  
  if (url.pathname === '/api-proxy') {
    const config = JSON.parse(await KEY_STORE.get('config') || '{}')
    if (!config.apiUrl || !config.apiKeys?.length) {
      return new Response('请先配置API信息', { status: 400 })
    }
    
    let currentIndex = parseInt(await KEY_STORE.get('currentIndex') || '0')
    const apiKey = config.apiKeys[currentIndex % config.apiKeys.length]
    
    await KEY_STORE.put('currentIndex', (currentIndex + 1).toString())
    
    const apiUrl = new URL(config.apiUrl)
    const newRequest = new Request(apiUrl.toString(), {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: request.body
    })
    
    return fetch(newRequest)
  }
  
  return new Response('Not Found', { status: 404 })
}

const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>API轮询配置</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h1>API轮询配置</h1>
    <form action="/save-config" method="post">
      <div class="form-group">
        <label for="apiUrl">API URL:</label>
        <input type="url" id="apiUrl" name="apiUrl" required>
      </div>
      
      <div class="form-group">
        <label for="moduleName">Module Name:</label>
        <input type="text" id="moduleName" name="moduleName" required>
      </div>
      
      <div class="form-group">
        <label>API Keys:</label>
        <div id="apiKeysContainer">
          <input type="text" name="apiKeys" required>
        </div>
        <button type="button" onclick="addApiKeyField()">添加KEY</button>
      </div>
      
      <button type="submit">保存配置</button>
    </form>
  </div>
  
  <script>
    function addApiKeyField() {
      const container = document.getElementById('apiKeysContainer')
      const input = document.createElement('input')
      input.type = 'text'
      input.name = 'apiKeys'
      container.appendChild(input)
    }
  </script>
</body>
</html>
`