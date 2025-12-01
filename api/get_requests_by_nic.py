from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs
from _supabase_client import get_supabase

class handler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            qs = parse_qs(parsed.query)
            nic = qs.get("nic", [None])[0]
            if not nic:
                return self._send_json(400, {"error": "nic query param required"})

            supabase = get_supabase()
            resp = supabase.table("aid_requests").select("*").eq("nic", nic).execute()

            return self._send_json(200, {"success": True, "requests": resp.data})
        except Exception as e:
            return self._send_json(500, {"error": str(e)})
