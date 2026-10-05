"""Cloudflare API helper via the custom.cloudflare credential surrogate."""
import json, sys, urllib.request
sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

BASE = "https://api.cloudflare.com/client/v4"
ALLOWED = ("api.cloudflare.com",)

def api(method, path, body=None, timeout=60):
    data = None
    headers = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    add_surrogate_to_request(req, "custom.cloudflare", allowed_hosts=ALLOWED)
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        return read_json_response(resp)
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read().decode())
        except Exception:
            detail = {"http_status": e.code}
        raise RuntimeError(f"CF API {method} {path} -> HTTP {e.code}: {json.dumps(detail)[:500]}")

if __name__ == "__main__":
    # usage: cf.py METHOD /path [json-body]
    method, path = sys.argv[1], sys.argv[2]
    body = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    print(json.dumps(api(method, path, body), indent=1)[:2000])
