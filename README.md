# Chess GOD for Flask

## Overview
Chess GOD is a web-based chess application built using Flask and Flask-SocketIO. It integrates the Stockfish chess engine to provide users with the best possible moves based on the current game state. The application allows users to interact with a chessboard, update the game state, and receive real-time feedback on the best moves.

## Project Structure
```
chess_GOD_for_Flask
├── src
│   ├── chessG.py          # Main Flask application
│   ├── download_stockfish.py  # Script to download Stockfish binary
│   └── static
│       └── index.html     # User interface for the chess game
├── requirements.txt       # Project dependencies
└── README.md              # Project documentation
```

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd chess_GOD_for_Flask
   ```

2. **Install Dependencies**
   Ensure you have Python 3.x installed. Then, install the required packages using pip:
   ```bash
   pip install -r requirements.txt
   ```

3. **Download Stockfish**
   The application includes a script to dynamically download the Stockfish binary for Linux. Run the following command to ensure Stockfish is available:
   ```bash
   python src/download_stockfish.py
   ```

4. **Run the Application**
   Start the Flask application with the following command:
   ```bash
   python src/chessG.py
   ```

5. **Access the Application**
   Open your web browser and navigate to `http://localhost:5000` to access the chess game interface.

## Usage
- Update the FEN string to reflect the current game state.
- The application will emit the best move based on the Stockfish analysis.
- Interact with the chessboard to play moves and receive real-time updates.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.