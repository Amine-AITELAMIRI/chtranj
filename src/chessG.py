import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO
import chess
import chess.engine
import os
import subprocess
import urllib.request

STOCKFISH_URL = "https://github.com/official-stockfish/Stockfish/releases/download/sf_17/stockfish-ubuntu-x86-64-avx2.tar"
STOCKFISH_DIR = "./stockfish"
STOCKFISH_PATH = os.path.join(STOCKFISH_DIR, "stockfish/stockfish-ubuntu-x86-64-avx2")

app = Flask(__name__, static_folder='static')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

last_fen = None

def download_stockfish():
    if not os.path.exists(STOCKFISH_PATH):
        if not os.path.exists(STOCKFISH_DIR):
            os.makedirs(STOCKFISH_DIR)
        tar_path = os.path.join(STOCKFISH_DIR, "stockfish-ubuntu-x86-64-avx2.tar")
        urllib.request.urlretrieve(STOCKFISH_URL, tar_path)
        subprocess.run(["tar", "-xvf", tar_path, "-C", STOCKFISH_DIR])
        os.remove(tar_path)
        if not os.path.exists(STOCKFISH_PATH):
            raise FileNotFoundError(f"Stockfish binary not found at {STOCKFISH_PATH} after extraction.")
        else:
            print("Stockfish binary downloaded and extracted successfully.")

def get_best_move(fen):
    if not os.path.exists(STOCKFISH_PATH):
        download_stockfish()
    board = chess.Board(fen)
    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        result = engine.analyse(board, chess.engine.Limit(time=1.0))
        if "pv" in result:
            best_move = result["pv"][0]
            return board.san(best_move)
        else:
            return "No best move found."

@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/update_fen', methods=['POST'])
def update_fen():
    global last_fen
    data = request.json
    fen = data.get("fen")
    if fen and fen != last_fen:
        last_fen = fen
        best_move = get_best_move(fen)
        socketio.emit('best_move', {'move': best_move})
        return jsonify({"status": "success", "best_move": best_move})
    return jsonify({"status": "skipped", "message": "Position unchanged"}), 200

@app.route('/move_played', methods=['POST'])
def move_played():
    data = request.json
    if data.get("type") == "move_played":
        socketio.emit('move_played', {'message': 'Move played'})
        return jsonify({"status": "success", "message": "Move played event emitted"})
    return jsonify({"status": "error", "message": "Invalid data"}), 400

if __name__ == "__main__":
    download_stockfish()
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
