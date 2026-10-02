from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


HTML_FILE = Path(__file__).with_name("Liverary.html")
HOST = "127.0.0.1"
PORT = 4173


class LiveraryHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/__liverary_version":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(str(HTML_FILE.stat().st_mtime_ns).encode("ascii"))
            return

        if path not in ("/", "/index.html", "/Liverary.html"):
            self.send_error(404)
            return

        html = HTML_FILE.read_text(encoding="utf-8")
        stamp = HTML_FILE.stat().st_mtime_ns
        reload_script = f"""<script>
(() => {{
  let version = {stamp};
  setInterval(async () => {{
    try {{
      const response = await fetch('/__liverary_version', {{ cache: 'no-store' }});
      const next = Number(await response.text());
      if (response.ok && next !== version) location.reload();
    }} catch {{}}
  }}, 800);
}})();
</script>"""
        html = html.replace("</body>", reload_script + "</body>")
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print(f"Liverary preview: http://{HOST}:{PORT}/")
    ThreadingHTTPServer((HOST, PORT), LiveraryHandler).serve_forever()
