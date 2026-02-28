import http.server
import socketserver
import json
import threading
import time

PORT = 8000

# 存储用户位置数据
user_locations = {}

class LocationHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/location':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            
            # 存储用户位置
            user_id = data.get('userId')
            if user_id:
                user_locations[user_id] = {
                    'lat': data.get('lat'),
                    'lng': data.get('lng'),
                    'timestamp': time.time()
                }
                print(f"Updated location for user {user_id}: {data.get('lat')}, {data.get('lng')}")
            
            # 响应
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
        else:
            super().do_POST()
    
    def do_GET(self):
        if self.path.startswith('/api/location/'):
            # 获取特定用户的位置
            user_id = self.path.split('/')[-1]
            location = user_locations.get(user_id)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(location or {}).encode('utf-8'))
        elif self.path == '/api/locations':
            # 获取所有用户位置
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(user_locations).encode('utf-8'))
        else:
            super().do_GET()

def start_server():
    with socketserver.TCPServer(("", PORT), LocationHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    start_server()