"""Minimal CDP driver for Qwizo QA. Usage: python3 cdp_driver.py"""
import json, subprocess, time, urllib.request, base64, sys
import websocket

CHROME = "/opt/meta-chromium/chrome"
PORT = 19222

class CDP:
    def __init__(self):
        self.proc = subprocess.Popen([
            CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
            f"--remote-debugging-port={PORT}", "--remote-allow-origins=*",
            "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccess,BlockInsecurePrivateNetworkRequests",
            "--no-proxy-server", "--proxy-bypass-list=<-loopback>",
            "--window-size=1440,900",
            "--disable-dev-shm-usage", "about:blank",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # wait for devtools endpoint
        ws_url = None
        for _ in range(60):
            try:
                tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list", timeout=2).read())
                pages = [t for t in tabs if t.get("type") == "page"]
                if pages:
                    ws_url = pages[0]["webSocketDebuggerUrl"]
                    break
            except Exception:
                pass
            time.sleep(0.5)
        if not ws_url:
            raise RuntimeError("CDP endpoint not ready")
        self.ws = websocket.create_connection(ws_url, timeout=30)
        self.msg_id = 0
        self.errors = []
        # enable events
        self.send("Runtime.enable")
        self.send("Page.enable")
        self.send("Log.enable")

    def send(self, method, params=None):
        self.msg_id += 1
        mid = self.msg_id
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"CDP {method}: {msg['error']}")
                return msg.get("result", {})
            self._handle_event(msg)

    def _handle_event(self, msg):
        m = msg.get("method", "")
        if m == "Runtime.exceptionThrown":
            d = msg["params"]["exceptionDetails"]
            self.errors.append(f"JS EXCEPTION: {d.get('text','')} {d.get('exception',{}).get('description','')[:300]}")
        elif m == "Runtime.consoleAPICalled":
            args = [a.get("value", a.get("description","")) for a in msg["params"].get("args", [])]
            if msg["params"]["type"] == "error":
                self.errors.append("CONSOLE ERROR: " + " ".join(str(a)[:200] for a in args))

    def drain(self, seconds=1.0):
        self.ws.settimeout(seconds)
        try:
            while True:
                msg = json.loads(self.ws.recv())
                self._handle_event(msg)
        except Exception:
            pass
        finally:
            self.ws.settimeout(30)

    def nav(self, url):
        self.send("Page.navigate", {"url": url})
        time.sleep(1.0)
        self.wait_for_idle()

    def wait_for_idle(self, timeout=15):
        # wait until network quiets: poll readyState + no pending for a bit
        end = time.time() + timeout
        while time.time() < end:
            r = self.eval("document.readyState")
            if r == "complete":
                time.sleep(0.8)
                return
            time.sleep(0.4)

    def eval(self, js):
        r = self.send("Runtime.evaluate", {"expression": js, "awaitPromise": True, "returnByValue": True})
        if r.get("exceptionDetails"):
            raise RuntimeError("eval exception: " + json.dumps(r["exceptionDetails"])[:400])
        return r["result"].get("value")

    def screenshot(self, path):
        r = self.send("Page.captureScreenshot", {"format": "png"})
        open(path, "wb").write(base64.b64decode(r["data"]))
        return path

    def close(self):
        try: self.ws.close()
        except Exception: pass
        self.proc.terminate()

if __name__ == "__main__":
    print("driver ok")
