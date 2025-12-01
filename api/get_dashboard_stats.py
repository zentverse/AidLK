from http.server import BaseHTTPRequestHandler
import json
from collections import Counter
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
            supabase = get_supabase()
            resp = supabase.table("aid_requests").select("*").execute()
            rows = resp.data or []

            total = len(rows)
            pending = sum(1 for r in rows if r["status"] == "pending")
            partial = sum(1 for r in rows if r["status"] == "partial")
            completed = sum(1 for r in rows if r["status"] == "completed")

            item_counter = Counter()
            location_counter = Counter()

            for r in rows:
                remaining = r["quantity_requested"] - r["quantity_received"]
                if remaining < 0:
                    remaining = 0
                if remaining > 0:
                    item_counter[r["item"]] += remaining
                    location_counter[r["location"]] += remaining

            top_items = item_counter.most_common(5)
            top_locations = location_counter.most_common(5)

            return self._send_json(200, {
                "success": True,
                "summary": {
                    "total": total,
                    "pending": pending,
                    "partial": partial,
                    "completed": completed
                },
                "top_items": [{"item": i, "remaining": c} for i, c in top_items],
                "top_locations": [{"location": loc, "remaining": c} for loc, c in top_locations],
            })
        except Exception as e:
            return self._send_json(500, {"error": str(e)})
