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

            request_id = data.get("id")
            received_qty = data.get("quantity_received")

            if not request_id or received_qty is None:
                return self._send_json(400, {"error": "id and quantity_received are required"})

            received_qty = int(received_qty)

            supabase = get_supabase()

            # Get current row
            current = supabase.table("aid_requests").select("*").eq("id", request_id).single().execute()
            row = current.data
            if not row:
                return self._send_json(404, {"error": "Request not found"})

            total_requested = row["quantity_requested"]
            new_received = max(0, min(total_requested, received_qty))

            if new_received >= total_requested:
                status = "completed"
            elif new_received > 0:
                status = "partial"
            else:
                status = "pending"

            updated = supabase.table("aid_requests").update({
                "quantity_received": new_received,
                "status": status,
            }).eq("id", request_id).execute()

            return self._send_json(200, {"success": True, "updated": updated.data})
        except Exception as e:
            return self._send_json(500, {"error": str(e)})
