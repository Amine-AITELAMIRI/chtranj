// ==UserScript==
// @name         Chess.com Live Game FEN Extractor (Your Turn + Move Played)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Sends FEN to backend when it's your turn and sends a special signal when you play a move via a different route.
// @author       You
// @match        https://www.chess.com/play/*
// @match        https://www.chess.com/game/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    'use strict';

    let previousFEN = null;

    function findChessBoard() {
        const board = document.querySelector('wc-chess-board');
        if (board?.game) return board;

        const boardSelectors = [
            '#board-vs-personalities',
            '#chess-board',
            '#board-single',
            '#board-layout-main'
        ];

        for (const selector of boardSelectors) {
            const board = document.querySelector(selector);
            if (board?.game) return board;
        }
        return null;
    }

    function getFEN() {
        const chessBoard = findChessBoard();
        if (chessBoard && chessBoard.game && chessBoard.game.getFEN) {
            return chessBoard.game.getFEN();
        }
        return null;
    }

    function getPlayerColor() {
        const chessBoard = findChessBoard();
        if (!chessBoard || !chessBoard.game) return null;

        const orientation = chessBoard.getAttribute('orientation');
        if (orientation === 'white' || orientation === 'black') {
            return orientation;
        }

        // Default fallback: assume bottom player is white
        return 'white';
    }

    function isPlayerTurn(fen, playerColor) {
        const activeColor = fen.split(' ')[1];
        return (activeColor === 'w' && playerColor === 'white') ||
               (activeColor === 'b' && playerColor === 'black');
    }

    function sendToBackend(route, data) {
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://cg-s5v9.onrender.com/${route}`, // Dynamic route
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(data),
            onload(response) {
                console.log(`Backend response (${route}):`, response.responseText);
            },
            onerror(error) {
                console.error(`Error sending data to ${route}:`, error);
            }
        });
    }

    function observeBoardChanges() {
        const board = findChessBoard();
        if (!board) return;

        const playerColor = getPlayerColor();

        const observer = new MutationObserver(() => {
            const currentFEN = getFEN();
            if (!currentFEN || currentFEN === previousFEN) return;

            const activeColorNow = currentFEN.split(' ')[1];
            const activeColorPrev = previousFEN ? previousFEN.split(' ')[1] : null;

            // Send FEN whenever it's player's turn
            if (isPlayerTurn(currentFEN, playerColor)) {
                sendToBackend("update_fen", { type: "your_turn", fen: currentFEN });
                console.log(`Your turn. FEN sent: ${currentFEN}`);
            }

            // Detect if player just made a move
            if (activeColorPrev && activeColorNow !== activeColorPrev) {
                if ((playerColor === 'white' && activeColorNow === 'b') ||
                    (playerColor === 'black' && activeColorNow === 'w')) {
                    // Player just moved; send explicit message via another route
                    sendToBackend("move_played", { type: "move_played" });
                    console.log(`You played a move. Signal sent to /move_played.`);
                }
            }

            previousFEN = currentFEN;
        });

        observer.observe(board, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // Wait for the board to load before observing
    const maxWaitTime = 10000; // 10 seconds timeout
    const startTime = Date.now();

    function waitForBoard() {
        if (Date.now() - startTime > maxWaitTime) {
            console.log('Chess Assistant: Board not found after timeout');
            return;
        }

        const board = findChessBoard();
        if (board?.game && board.game.getFEN) {
            previousFEN = getFEN(); // Initialize previous FEN
            observeBoardChanges();
            console.log('Chess Assistant: Board found and observing started.');
        } else {
            setTimeout(waitForBoard, 500); // Retry every 500ms
        }
    }

    waitForBoard();

})();
