#!/usr/bin/env python3
"""Serve the built single-page game and proxy its API to the local Scala server."""
import argparse
import http.client
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=5179)
    parser.add_argument('--api-port', type=int, default=8093)
    args = parser.parse_args()
    dist = ROOT / 'frontend/dist'
    if not (dist / 'index.html').is_file():
        parser.error('Missing frontend/dist; run npm --prefix frontend run build first.')

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *values, **options):
            super().__init__(*values, directory=str(dist), **options)

        def do_GET(self):
            if self.path == '/health':
                return self.proxy()
            if urlsplit(self.path).path in ('/', '/game', '/game/'):
                self.path = '/index.html'
            super().do_GET()

        def do_POST(self):
            if not self.path.startswith('/api/'):
                return self.send_error(404)
            self.proxy()

        def proxy(self):
            try:
                length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                return self.send_error(400)
            if not 0 <= length <= 2 * 1024 * 1024:
                return self.send_error(413)
            body = self.rfile.read(length) if length else None
            headers = {name: self.headers[name] for name in ('Content-Type', 'Authorization') if name in self.headers}
            connection = http.client.HTTPConnection('127.0.0.1', args.api_port, timeout=30)
            try:
                connection.request(self.command, self.path, body, headers)
                response = connection.getresponse()
                data = response.read()
                self.send_response(response.status)
                self.send_header('Content-Type', response.getheader('Content-Type', 'application/json'))
                self.send_header('Content-Length', str(len(data)))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(data)
            except (OSError, http.client.HTTPException):
                self.send_error(502, 'Scala API unavailable; the current game has not been saved.')
            finally:
                connection.close()

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Built game: http://127.0.0.1:{args.port} (Scala API {args.api_port})', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
