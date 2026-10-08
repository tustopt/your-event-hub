"""Read-only checks for SSR, assets and authorization, before/after publication."""
import html
import re
import sys
import urllib.error
import urllib.parse
import urllib.request


def verify(origin, local=False):
    def request(path, method='GET'):
        req = urllib.request.Request(origin + path, method=method,
                                     data=b'{}' if method == 'POST' else None,
                                     headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.headers, error.read()

    checks = []
    assets = set()
    for path in ['/docradar/', '/docradar/login', '/docradar/explorar']:
        status, headers, body = request(path)
        assert status == 200, f'{path}: HTTP {status}'
        text = body.decode()
        assert 'text/html' in headers.get('Content-Type', ''), path
        assert '<title>docradar' in text, f'{path}: titulo inesperado'
        assert "This page didn't load" not in text, f'{path}: erro SSR'
        checks.append({'page': path, 'status': status})
        for url in re.findall(r'(?:src|href)="([^"]+)"', text):
            url = html.unescape(url)
            if url.endswith(('.js', '.css', '.ico')) and url.startswith('/'):
                assert url.startswith('/docradar/'), f'Asset fora do projeto: {url}'
                assets.add(url)
    assert any(url.endswith('.js') for url in assets), 'JavaScript ausente'
    assert any(url.endswith('.css') for url in assets), 'CSS ausente'
    for asset in sorted(assets):
        path = asset.removeprefix('/docradar') if local else asset
        status, headers, body = request(path)
        assert status == 200 and body, f'Asset: HTTP {status}: {asset}'
        assert 'text/html' not in headers.get('Content-Type', ''), f'Asset devolveu HTML: {asset}'
    checks.append({'assets': len(assets), 'status': 'passed'})
    for kind in ['admin', 'internal', 'public']:
        path = f'/docradar/api/{kind}/ingest/source/cinemateca'
        status, _, _ = request(path, 'POST')
        assert status == 401, f'{path}: esperado 401, recebido {status}'
        checks.append({'protected_api': kind, 'status': status})
    return checks


if __name__ == '__main__':
    import json
    print(json.dumps(verify(sys.argv[1], '--local' in sys.argv[2:]), indent=2))
