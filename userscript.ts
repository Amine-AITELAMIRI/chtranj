// ==UserScript==
// @name         ChessG
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Sends FEN to backend when it's your turn and sends a special signal when you play a move via a different route, ensuring proper order of requests.
// @author       You
// @match        https://www.chess.com/play/*
// @match        https://www.chess.com/game/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    'use strict';

    let previousFEN = null;
    let awaitingResponse = false;
    let pendingMovePlayed = false;

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

    function sendToBackend(route, data, callback) {
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://cg-s5v9.onrender.com/${route}`, // Dynamic route
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(data),
            onload(response) {
                console.log(`Backend response (${route}):`, response.responseText);
                if (callback) callback();
            },
            onerror(error) {
                console.error(`Error sending data to ${route}:`, error);
                if (callback) callback();
            }
        });
    }

    function observeBoardChanges() {
        const board = findChessBoard();
        if (!board) return;

        const observer = new MutationObserver(() => {
            const currentFEN = getFEN();
            if (!currentFEN || currentFEN === previousFEN) return;

            const activeColorNow = currentFEN.split(' ')[1];
            const activeColorPrev = previousFEN ? previousFEN.split(' ')[1] : null;

            if (!awaitingResponse) {
                awaitingResponse = true;
                sendToBackend("update_fen", { type: "fen_update", fen: currentFEN }, () => {
                    awaitingResponse = false;
                    console.log(`FEN update sent: ${currentFEN}`);

                    if (pendingMovePlayed) {
                        sendToBackend("move_played", { type: "move_played" }, () => {
                            console.log(`Pending move_played signal sent.`);
                            pendingMovePlayed = false;
                            sendToBackend("update_fen", { type: "fen_update", fen: getFEN() });
                        });
                    }
                });
            } else {
                if (activeColorPrev && activeColorNow !== activeColorPrev) {
                    pendingMovePlayed = true;
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
