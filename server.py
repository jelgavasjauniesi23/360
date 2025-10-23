#!/usr/bin/env python3
"""
Simple HTTP server for serving the 360° Virtual Tour application.
Run this script and navigate to http://127.0.0.1:5500/ in your browser.
"""

import http.server
import socketserver
import os
import webbrowser
import json
import urllib.parse
from pathlib import Path

# Configuration
PORT = 5500
HOST = '127.0.0.1'

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow loading images from different folders
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        # Handle hotspots API
        if self.path.startswith('/api/hotspots/'):
            self.handle_get_hotspots()
        # Handle root path
        elif self.path == '/':
            self.path = '/index.html'
            return super().do_GET()
        else:
            return super().do_GET()

    def do_POST(self):
        # Handle hotspots API
        if self.path.startswith('/api/hotspots/'):
            self.handle_save_hotspots()
        else:
            return super().do_POST()

    def handle_get_hotspots(self):
        """Get hotspots for a specific folder"""
        try:
            # Extract folder name from path
            folder = self.path.split('/')[-1]
            hotspots_file = f'hotspots_{folder}.json'
            
            if os.path.exists(hotspots_file):
                with open(hotspots_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
            else:
                # Return empty hotspots if file doesn't exist
                empty_data = {"hotspots": []}
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(empty_data).encode('utf-8'))
        except Exception as e:
            self.send_error(500, f"Error reading hotspots: {str(e)}")

    def handle_save_hotspots(self):
        """Save hotspots for a specific folder"""
        try:
            # Extract folder name from path
            folder = self.path.split('/')[-1]
            hotspots_file = f'hotspots_{folder}.json'
            
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Save to JSON file
            with open(hotspots_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Hotspots saved successfully"}).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Error saving hotspots: {str(e)}")

def main():
    # Change to the directory containing this script
    os.chdir(Path(__file__).parent)
    
    # Create server
    with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🚀 360° Virtual Tour Server")
        print(f"📡 Server running at http://{HOST}:{PORT}/")
        print(f"📁 Serving files from: {os.getcwd()}")
        print(f"🔧 Press Ctrl+C to stop the server")
        print("-" * 50)
        
        # Open browser automatically
        try:
            webbrowser.open(f'http://{HOST}:{PORT}/')
            print("🌐 Browser opened automatically")
        except:
            print("⚠️  Could not open browser automatically")
            print(f"   Please navigate to http://{HOST}:{PORT}/ manually")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            httpd.shutdown()

if __name__ == "__main__":
    main()
