"""Launch the DriveGuard Web Application."""

import sys
import uvicorn
from driveguard.config import load_config

def main():
    config = load_config("config.yaml")
    host = config.server.host
    port = config.server.port
    print("\n=======================================================")
    print("   [DriveGuard] Real-Time Driver-State Cockpit")
    print(f"   Web Dashboard: http://{host}:{port}")
    print("   Privacy: Local processing only (no video saved)")
    print("=======================================================\n")
    uvicorn.run("web.app:app", host=host, port=port, reload=False)

if __name__ == "__main__":
    main()
