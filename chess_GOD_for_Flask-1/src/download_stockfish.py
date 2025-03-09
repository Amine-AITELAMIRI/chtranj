import os
import requests

STOCKFISH_URL = "https://github.com/bagder/stockfish/releases/latest/download/stockfish-linux.zip"
STOCKFISH_DIR = "./stockfish"
STOCKFISH_BINARY = os.path.join(STOCKFISH_DIR, "stockfish")

def check_stockfish_exists():
    return os.path.exists(STOCKFISH_BINARY)

def download_stockfish():
    if not os.path.exists(STOCKFISH_DIR):
        os.makedirs(STOCKFISH_DIR)

    response = requests.get(STOCKFISH_URL)
    if response.status_code == 200:
        with open(os.path.join(STOCKFISH_DIR, "stockfish.zip"), "wb") as f:
            f.write(response.content)
        return True
    return False

def extract_stockfish():
    import zipfile
    with zipfile.ZipFile(os.path.join(STOCKFISH_DIR, "stockfish.zip"), 'r') as zip_ref:
        zip_ref.extractall(STOCKFISH_DIR)

def setup_stockfish():
    if not check_stockfish_exists():
        if download_stockfish():
            extract_stockfish()
            os.remove(os.path.join(STOCKFISH_DIR, "stockfish.zip"))
            print("Stockfish downloaded and extracted successfully.")
        else:
            print("Failed to download Stockfish.")
    else:
        print("Stockfish already exists.")

if __name__ == "__main__":
    setup_stockfish()