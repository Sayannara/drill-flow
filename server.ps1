$port = 8080
$path = $PWD.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server started on http://localhost:$port/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $reqPath = $request.Url.LocalPath
        if ($reqPath -eq "/") { $reqPath = "/index.html" }
        $reqPath = $reqPath -replace '/', '\'
        $fullPath = Join-Path $path $reqPath
        
        if (Test-Path $fullPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = "application/octet-stream"
            switch ($ext) {
                ".html" { $mime = "text/html" }
                ".js"   { $mime = "application/javascript" }
                ".css"  { $mime = "text/css" }
                ".jpg"  { $mime = "image/jpeg" }
                ".png"  { $mime = "image/png" }
                ".svg"  { $mime = "image/svg+xml" }
                ".json" { $mime = "application/json" }
            }
            $response.ContentType = $mime
            
            try {
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
        }
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
}
