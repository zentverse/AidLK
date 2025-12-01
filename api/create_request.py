from http.server import BaseHTTPRequestHandler
import json
from _supabase_client import get_supabase

class handler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8")) if body else {}

            nic = data.get("nic")
            phone = data.get("phone")
            location = data.get("location")
            items = data.get("items", [])  # list of {category, item, quantity}

            if not nic or not location or not items:
                return self._send_json(400, {"error": "nic, location, and items are required"})

            supabase = get_supabase()

            rows = []
            for entry in items:
                category = entry.get("category")
                item = entry.get("item")
                qty = entry.get("quantity")
                if not category or not item or qty is None:
                    continue
                rows.append({
                    "nic": nic,
                    "phone": phone,
                    "location": location,
                    "category": category,
                    "item": item,
                    "quantity_requested": int(qty),
                    "quantity_received": 0,
                    "status": "pending",
                })

            if not rows:
                return self._send_json(400, {"error": "No valid items in request"})

            resp = supabase.table("aid_requests").insert(rows).execute()
            return self._send_json(200, {"success": True, "inserted": len(resp.data)})
        except Exception as e:
            return self._send_json(500, {"error": str(e)})
