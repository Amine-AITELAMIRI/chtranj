// ==UserScript==
// @name         Chess.com Live Game FEN Extractor (Your Turn + Move Played)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Sends FEN to backend whenever the board changes and sends a special signal when you play a move via a different route.
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

        const observer = new MutationObserver(() => {
            const currentFEN = getFEN();
            if (!currentFEN || currentFEN === previousFEN) return;

            // Send FEN to backend whenever the board changes
            sendToBackend("update_fen", { type: "board_change", fen: currentFEN });
            console.log(`Board changed. FEN sent: ${currentFEN}`);

            const activeColorNow = currentFEN.split(' ')[1];
            const activeColorPrev = previousFEN ? previousFEN.split(' ')[1] : null;

            // Detect if a move was just played
            if (activeColorPrev && activeColorNow !== activeColorPrev) {
                sendToBackend("move_played", { type: "move_played" });
                console.log(`Move played. Signal sent to /move_played.`);
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
