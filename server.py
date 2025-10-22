#!/usr/bin/env python3
"""
Simple HTTP server for serving the 360° Virtual Tour application.
Run this script and navigate to http://127.0.0.1:5500/ in your browser.
"""

import http.server
import socketserver
import os
import webbrowser
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
        # Handle root path
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

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
