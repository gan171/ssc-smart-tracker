import uvicorn
import sys
import os

if __name__ == "__main__":
    # 1. Force Python to see the current folder
    sys.path.append(os.getcwd())

    # 2. Run the server programmatically
    #    reload=True allows you to edit code while it runs
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)