(function () {
  "use strict";

  let board = document.querySelector('.board');
  const notification = document.querySelector('.notification');
  const notificationText = notification.querySelector(".txt");
  const svgNS = "http://www.w3.org/2000/svg";
  const xlinkNS = "http://www.w3.org/1999/xlink";

  board.onclick = onClick;

  let markQueue = [],
  currentGameWinner,winningLine,playerMark,aiMark;

  function onClick(e) {
    const target = e.target;
    if (target.classList.contains("cell") && !target.hasChildNodes() && !currentGameWinner && !markQueue.find(({
      cell }) =>
    cell === target)) {
      if (markQueue.length === 0) {
        addMark(target, playerMark);
        // console.log("added mark", playerMark, "to cell", target);
      } else {
        markQueue.push({
          cell: target,
          mark: playerMark });

        // console.log("pushed mark", playerMark, "to queue wit cell ===", target);
      }

      const {
        aimove,
        winner,
        line } =
      ai.playerMove(cells.indexOf(target));
      // console.log("pushing ai mark to", aimove, cells[aimove], "winner:", winner);
      if (aimove != null) markQueue.push({
        cell: cells[aimove],
        mark: aiMark });

      currentGameWinner = winner;
      winningLine = line;
    }
  }

  function addMark(cell, mark) {
    const svg = document.createElementNS(svgNS, "svg");
    const use = document.createElementNS(svgNS, "use");

    use.setAttributeNS(xlinkNS, "href", mark === "X" ? "#cross" : "#circ");

    svg.appendChild(use);
    cell.appendChild(svg);
  }

  board.addEventListener("animationend", onAnimationEnd);

  function onAnimationEnd({
    target,
    animationName })
  {
    // console.log("anim ended", animationName, target);
    if (animationName === "draw") {
      // console.log("Mark drawn on", target);
      if (markQueue.length > 0) {
        const {
          cell,
          mark } =
        markQueue.shift();
        addMark(cell, mark);

      } else if (currentGameWinner) {
        // console.log("HAVE WINNER", currentGameWinner);
        if (winningLine) highlightLine(winningLine);else
        declareWinner(currentGameWinner);
      }
    } else if (animationName === "fall" && target === cells[3] && notification.mode === "game over") {
      // console.log("Board cleared");
      showNotification(false);
    } else if (animationName === "arrive" && target === cells[0]) {
      // console.log("Board recreated");
      board.classList.remove("arrive");
    } else if (animationName === "flare") {
      // console.log("Highlight ended");
      declareWinner(currentGameWinner);
    }
  }

  notification.addEventListener("animationend", function ({
    animationName })
  {
    if (animationName === "inbound") {
      if (notification.mode === "game over") {
        fall();
      } else if (notification.mode === "player selection") {
        resetGame();
      }
    } else if (animationName === "outbound" && notification.mode === "game over") {
      presentPlayerChoice();
    }
  });

  notification.onclick = function (e) {
    if (notification.mode === "game over") {
      showNotification(false);
    } else {
      if (e.target.matches("svg.X")) setPlayerMark("X");else
      if (e.target.matches("svg.O")) setPlayerMark("O");
    }
  };

  function setPlayerMark(mark) {
    playerMark = mark;
    aiMark = mark === "X" ? "O" : "X";
    // console.log("player:", mark, ", AI:", aiMark);
    ai.setPCPlayer(playerMark);
    showNotification(false);

    const aimove = ai.resetGame();
    if (aimove) addMark(cells[aimove.aimove], aiMark);
  }

  function declareWinner(winner) {
    notification.mode = "game over";
    notification.classList.add(winner);

    notificationText.textContent = winner === "tie" ? "Empate" : "Gano";
    showNotification();
  }

  function blockPointerEvents(block = true) {
    board.style.pointerEvents = block ? "none" : "";
  }

  function showNotification(show = true) {
    if (show) {
      blockPointerEvents();
      notification.classList.remove("outbound");
      notification.classList.add("inbound");
    } else {
      notification.classList.add("outbound");
      notification.classList.remove("inbound", "selection");
      blockPointerEvents(false);
    }
  }

  function highlightLine(line) {
    for (let ind of line) {
      cells[ind].classList.add("highlighted");
    }
  }

  function generateBoard() {
    const clones = [];
    const fragment = document.createDocumentFragment();
    const cell = document.createElement("div");
    cell.className = "cell";

    fragment.appendChild(cell);
    clones.push(cell);

    let i = 8;
    while (i--) {
      const clone = cell.cloneNode(false);
      fragment.appendChild(clone);
      clones.push(clone);
    }

    return {
      clones,
      fragment };

  }

  function presentPlayerChoice() {
    notification.mode = "player selection";
    notification.classList.remove("X", "O", "tie");
    notification.classList.add("selection");
    notificationText.textContent = "Choose player";
    showNotification();
  }

  let cells;

  function emptyBoard() {
    const clone = board.cloneNode(false);
    clone.onclick = onClick;
    clone.addEventListener("animationend", onAnimationEnd);
    clone.className = "board arrive";
    let fragment;
    ({
      clones: cells,
      fragment } =
    generateBoard());
    clone.appendChild(fragment);

    board.parentNode.replaceChild(clone, board);
    board = clone;
  }

  function resetGame() {
    emptyBoard();
    markQueue = [];
    winningLine = currentGameWinner = undefined;
  }

  function fall() {
    board.classList.add("fall");
  }

  document.addEventListener("DOMContentLoaded", function () {
    // console.log("DOM fully loaded and parsed");
    cells = Array.from(document.getElementsByClassName("cell"));
    notification.mode = "player selection";
  });

  const easymodeOn = document.getElementById("easymode");

  function randomizedEasyMode() {
    if (!easymodeOn.checked) return false;
    // return true;
    return Math.random() > 0.5;
  }

  const ai = function (easymode) {

    let board = Array(9).fill(null);
    // +--------------> X
    // |	* | * | *
    // |	---------
    // |	* | * | *
    // |	---------
    // |	* | * | *
    // |
    // \/
    // Y
    // where * === null
    //
    // so that board[x * y] corresponds nicely
    // board[0 * 2] would be first column last element
    // 	* | * | *
    // 	---------
    // 	* | * | *
    // 	---------
    // 	X | * | *

    // X goes first
    const first = "X",
    second = "O",
    startDepth = 4;
    let AI = first,
    PC = second;

    function setAIPlayer(mark) {
      if (mark === first) {
        AI = first;
        PC = second;
      } else if (mark === second) {
        AI = second;
        PC = first;
      } else throw new Error("no such mark: " + mark);
    }

    function setPCPlayer(mark) {
      setAIPlayer(mark === first ? second : mark === second ? first : mark);
    }

    function getMarks() {
      return {
        AI,
        PC };

    }

    function aiMove() {
      const aimove = minimax(startDepth, AI).index;
      if (aimove != null) board[aimove] = AI;
      return Object.assign({
        aimove },
      isGameOver());
    }

    function playerMove(x, y = 1) {
      if (x * y > 8) throw new RangeError("No such cell number on board: " + x * y);
      board[x * y] = PC;
      // console.log("LOGIC: adding", PC, "to", x*y);
      return aiMove();
    }

    function getBoard() {
      return board;
    }

    function resetBoard() {
      board = Array(9).fill(null);
    }

    function resetGame() {
      resetBoard();
      if (AI === first) return aiMove();
    }

    function getMarkAt(x, y) {
      return board[x * y];
    }

    function getValidMoves() {
      const emptyCellsIndexes = [];
      if (isGameOver()) return emptyCellsIndexes;
      board.forEach((v, ind) => {
        if (v === null) emptyCellsIndexes.push(ind);
      });
      return emptyCellsIndexes;
    }

    function boardIsFilled() {
      return !board.includes(null);
    }

    // returns winner if any
    function isGameOver() {

      for (let i = 0; i < 3; ++i) {
        // checking columns
        if (board[i * 3] && board[i * 3] === board[i * 3 + 1] && board[i * 3] === board[i * 3 + 2]) {
          return {
            winner: board[i * 3],
            line: [i * 3, i * 3 + 1, i * 3 + 2] };

        }

        // checking rows
        if (board[i] && board[i] === board[i + 3] && board[i] === board[i + 6]) {
          return {
            winner: board[i],
            line: [i, i + 3, i + 6] };

        }

        // checking diagonals
        if (i === 0 && board[i] && board[i] === board[i + 4] && board[i] === board[i + 8]) {
          return {
            winner: board[i],
            line: [i, i + 4, i + 8] };

        }
        if (i === 2 && board[i] && board[i] === board[i + 2] && board[i] === board[i + 4]) {
          return {
            winner: board[i],
            line: [i, i + 2, i + 4] };

        }
      }

      // check if board is filled
      if (boardIsFilled()) {
        return {
          winner: "tie" };

      }

      // no winner yet
      return null;
    }

    function minimax(depth, player) {
      const emptyCells = getValidMoves();

      let bestScore = player === first ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      secondBestScore,currentScore,bestInd,secondBestInd;

      if (emptyCells.length === 0 || depth === 0) {
        bestScore = calculateScore() * (depth + 1);
      } else {
        for (let i = 0; i < emptyCells.length; ++i) {
          const currentInd = emptyCells[i];
          board[currentInd] = player;

          // first is a maximizing agent
          if (player === first) {
            currentScore = minimax(depth - 1, second).score;
            if (currentScore > bestScore) {
              secondBestScore = bestScore;
              bestScore = currentScore;
              secondBestInd = bestInd;
              bestInd = currentInd;
            }
          } else if (player === second) {
            // second is a minimizing agent
            currentScore = minimax(depth - 1, first).score;
            if (currentScore < bestScore) {
              secondBestScore = bestScore;
              bestScore = currentScore;
              secondBestInd = bestInd;
              bestInd = currentInd;
            }
          } else throw new Error("Something went wrong; player is neither X nor O, it's " + player);
          board[currentInd] = null;
        }
      }

      if (secondBestScore != undefined && secondBestInd != undefined && (typeof easymode === "function" ? easymode() : easymode) && depth === startDepth) {
        // console.log("EASYMODE");
        return {
          score: secondBestScore,
          index: secondBestInd };

      }
      return {
        score: bestScore,
        index: bestInd };

    }

    function calculateScore() {
      let score = 0;

      for (let i = 0; i < 3; ++i) {
        // checking columns

        let firstCount = 0,
        secondCount = 0,
        emptyCount = 0;
        if (board[i * 3] === first) ++firstCount;else
        if (board[i * 3] === second) ++secondCount;else
        ++emptyCount;

        if (board[i * 3 + 1] === first) ++firstCount;else
        if (board[i * 3 + 1] === second) ++secondCount;else
        ++emptyCount;

        if (board[i * 3 + 2] === first) ++firstCount;else
        if (board[i * 3 + 2] === second) ++secondCount;else
        ++emptyCount;

        score += calculateScoreForLine(firstCount, secondCount, emptyCount);

        // checking rows
        firstCount = secondCount = emptyCount = 0;
        if (board[i] === first) ++firstCount;else
        if (board[i] === second) ++secondCount;else
        ++emptyCount;

        if (board[i + 3] === first) ++firstCount;else
        if (board[i + 3] === second) ++secondCount;else
        ++emptyCount;

        if (board[i + 6] === first) ++firstCount;else
        if (board[i + 6] === second) ++secondCount;else
        ++emptyCount;

        score += calculateScoreForLine(firstCount, secondCount, emptyCount);

        // checking diagonals
        firstCount = secondCount = emptyCount = 0;
        if (i === 0) {
          if (board[i] === first) ++firstCount;else
          if (board[i] === second) ++secondCount;else
          ++emptyCount;

          if (board[i + 4] === first) ++firstCount;else
          if (board[i + 4] === second) ++secondCount;else
          ++emptyCount;

          if (board[i + 8] === first) ++firstCount;else
          if (board[i + 8] === second) ++secondCount;else
          ++emptyCount;
          score += calculateScoreForLine(firstCount, secondCount, emptyCount);
        } else if (i === 2) {
          if (board[i] === first) ++firstCount;else
          if (board[i] === second) ++secondCount;else
          ++emptyCount;

          if (board[i + 2] === first) ++firstCount;else
          if (board[i + 2] === second) ++secondCount;else
          ++emptyCount;

          if (board[i + 4] === first) ++firstCount;else
          if (board[i + 4] === second) ++secondCount;else
          ++emptyCount;
          score += calculateScoreForLine(firstCount, secondCount, emptyCount);
        }
      }
      return score;
    }

    function calculateScoreForLine(firstCount, secondCount, emptyCount) {
      if (firstCount === 3) return 100; // XXX case
      else if (secondCount === 3) return -100; // OOO case
        else if (firstCount === 2 && emptyCount === 1) return 10; // XX* case
          else if (secondCount === 2 && emptyCount === 1) return -10; // OO* case
            else if (firstCount === 1 && emptyCount === 2) return 1; // X** case
              else if (secondCount === 1 && emptyCount === 2) return -1; // O** case
      return 0; // XOX case
    }

    return {
      setAIPlayer,
      setPCPlayer,
      getMarks,
      playerMove,
      resetGame,
      getMarkAt,
      isGameOver };


  }(randomizedEasyMode);
})();