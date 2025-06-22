import React, { useState, useEffect, useRef, useCallback } from 'react';

// Main App Component
const App = () => {
  const [gameState, setGameState] = useState('start'); // 'start', 'difficulty', 'number_selection', 'memorize_original', 'odd_one_out_recall', 'round_win', 'overall_win', 'game_over'
  const [difficulty, setDifficulty] = useState(null); // 'easy', 'medium', 'hard'
  const [numTiles, setNumTiles] = useState(null); // Number of tiles in the grid
  const [originalGridNumbers, setOriginalGridNumbers] = useState([]); // Numbers in their initial, ordered state
  const [currentGridNumbers, setCurrentGridNumbers] = useState([]); // Numbers currently displayed on grid (can be original or modified/scrambled)
  const [preparedRecallNumbers, setPreparedRecallNumbers] = useState([]); // The final grid state (scrambled with one changed number) for the recall phase
  const [changedTileIndex, setChangedTileIndex] = useState(null); // Index of the tile that changed in the *preparedRecallNumbers* array
  const [selectedTileIndex, setSelectedTileIndex] = useState(null); // Index of the tile selected by the user
  const [roundScore, setRoundScore] = useState(0); // Score for the current round (either 0 or BASE_SCORE_PER_CORRECT)
  const [totalScore, setTotalScore] = useState(0); // Cumulative score across rounds
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalActions, setModalActions] = useState([]);
  const [countdown, setCountdown] = useState(0); // New state for countdown timer
  const gridRef = useRef(null);

  // Dynamic grid dimension based on numTiles for layout.
  // Calculates the side length of the smallest square grid that can contain numTiles.
  // We ensure a minimum of 3x3 for visual appeal.
  const currentGridDimension = numTiles ? Math.max(3, Math.ceil(Math.sqrt(numTiles))) : 3;

  // Constants for game logic
  const BASE_SCORE_PER_CORRECT = 20; // Changed to 20 points per correct identification
  const TOTAL_SCORE_TO_WIN = 100; // Updated from 300 to 100 points to win
  const NUMBER_POOL_MAX = 100; // Numbers will vary from 1 to 100

  // Function to generate 'count' unique random numbers from 1 to NUMBER_POOL_MAX
  const generateUniqueNumbers = useCallback((count) => {
    const actualCount = Math.min(count, NUMBER_POOL_MAX);
    const allPossibleNumbers = Array.from({ length: NUMBER_POOL_MAX }, (_, i) => i + 1);
    const shuffledNumbers = allPossibleNumbers.sort(() => 0.5 - Math.random());
    return shuffledNumbers.slice(0, actualCount);
  }, []);

  // Function to set up a new Odd One Out round
  const setupOddOneOutRound = useCallback((count) => {
    setRoundScore(0); // Reset round score for the new round
    setSelectedTileIndex(null); // Clear user selection

    // 1. Generate initial unique numbers for the grid (in order)
    const initialNumbers = generateUniqueNumbers(count);
    setOriginalGridNumbers([...initialNumbers]); // Store for the initial "memorize_original" phase

    // 2. Prepare the grid that will be shown during the recall phase (scrambled with one change)
    let finalRecallNumbers = [...initialNumbers];
    const originalIndexToChange = Math.floor(Math.random() * initialNumbers.length); // Random index to change

    let newChangedValue;
    do {
      // Generate a new number that is NOT present in the *original* set of numbers
      // to ensure it's truly an "odd one out" and different from the number it's replacing
      newChangedValue = Math.floor(Math.random() * NUMBER_POOL_MAX) + 1;
    } while (initialNumbers.includes(newChangedValue) || newChangedValue === initialNumbers[originalIndexToChange]);

    // Apply the change to the `finalRecallNumbers` array *before* scrambling it
    finalRecallNumbers[originalIndexToChange] = newChangedValue;

    // Scramble the array that now contains the changed number
    const shuffledFinalRecallNumbers = finalRecallNumbers.sort(() => 0.5 - Math.random());

    // Find the new position (index) of the 'changed number' in the *scrambled* array
    const finalChangedIndexInScrambled = shuffledFinalRecallNumbers.indexOf(newChangedValue);

    // Store this prepared final grid state and the index of the changed tile
    setPreparedRecallNumbers(shuffledFinalRecallNumbers);
    setChangedTileIndex(finalChangedIndexInScrambled);

    // Set the initial grid numbers for the "memorize_original" phase
    setCurrentGridNumbers([...initialNumbers]);
  }, [generateUniqueNumbers]);

  // Handle difficulty selection
  const handleDifficultySelect = (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    setTotalScore(0); // Reset total score when changing difficulty/starting new game from difficulty
    setGameState('number_selection');
  };

  // Handle number of tiles selection
  const handleNumTilesSelect = (count) => {
    setNumTiles(count);
    setFeedbackMessage('');
    setupOddOneOutRound(count); // Set up the game state with the chosen number of tiles
    setGameState('memorize_original'); // Transition to the initial memorization phase
  };

  // Function to restart the current game (Try Again / Next Round)
  const handleNextRoundOrTryAgain = useCallback(() => {
    setShowModal(false); // Close the modal
    if (numTiles !== null) {
      setupOddOneOutRound(numTiles); // Restart the round with the same number of tiles
      setGameState('memorize_original'); // Go back to the initial memorization phase
      setFeedbackMessage(''); // Clear any previous feedback
    }
  }, [numTiles, setupOddOneOutRound]);

  // Effect for managing game flow and timers (memorize then scramble/change)
  useEffect(() => {
    let memorizeTimer;
    let countdownInterval;

    if (gameState === 'memorize_original') {
      const memorizeTime = difficulty === 'easy' ? 4000 : difficulty === 'medium' ? 8000 : 12000; // 4s, 8s, 12s

      setCountdown(memorizeTime / 1000); // Initialize countdown in seconds
      setFeedbackMessage('Observe the numbers!'); // Display message as feedback, not in modal
      setModalActions([]); // Ensure no modal actions for this state
      setShowModal(false); // Ensure modal is hidden

      countdownInterval = setInterval(() => {
        setCountdown(prevCountdown => {
          if (prevCountdown <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);

      memorizeTimer = setTimeout(() => {
        clearInterval(countdownInterval); // Clear interval when time is up
        setFeedbackMessage('Find the changed number!'); // Change feedback message
        // After memorization, update currentGridNumbers to the prepared scrambled+changed version
        setCurrentGridNumbers(preparedRecallNumbers);
        setGameState('odd_one_out_recall'); // Transition to the recall phase
        setCountdown(0); // Reset countdown
      }, memorizeTime);
    }
    return () => {
      clearTimeout(memorizeTimer); // Clean up timer on component unmount or state change
      clearInterval(countdownInterval); // Clean up countdown interval
    };
  }, [gameState, difficulty, preparedRecallNumbers]); // Re-run effect if these dependencies change


  // Handle tile click during recall phase
  const handleTileClick = (index) => {
    if (gameState === 'odd_one_out_recall') {
      setSelectedTileIndex(index); // Set the index of the tile selected by the user
    }
  };

  // Check answers when user submits
  const handleSubmitRecall = () => {
    if (selectedTileIndex === null) {
      setFeedbackMessage('Please select a tile!');
      return;
    }

    const homeAction = { text: 'Home', onClick: () => { setGameState('start'); setShowModal(false); setSelectedTileIndex(null); setTotalScore(0); } };
    const tryAgainAction = { text: 'Try Again', onClick: handleNextRoundOrTryAgain };
    const nextRoundAction = { text: 'Next Round', onClick: handleNextRoundOrTryAgain };

    if (selectedTileIndex === changedTileIndex) {
      setRoundScore(BASE_SCORE_PER_CORRECT); // Set round score
      setTotalScore(prevTotal => {
        const newTotal = prevTotal + BASE_SCORE_PER_CORRECT;
        if (newTotal >= TOTAL_SCORE_TO_WIN) {
          setGameState('overall_win');
          setFeedbackMessage('You are the CHAMPION!');
          setModalMessage('You are the CHAMPION! Final Score: ' + newTotal);
          setModalActions([homeAction]); // Only Home after overall win
        } else {
          setGameState('round_win');
          setFeedbackMessage('Round Complete!');
          setModalMessage(`Round Complete! Total Score: ${newTotal}.`);
          setModalActions([homeAction, nextRoundAction]);
        }
        setShowModal(true); // Show modal for win/round complete
        return newTotal;
      });
    } else {
      setRoundScore(0); // No score for incorrect selection
      setGameState('game_over');
      setFeedbackMessage('Wrong! The changed number was: ' + currentGridNumbers[changedTileIndex]);
      setModalMessage('Game Over! The changed tile was: ' + currentGridNumbers[changedTileIndex]);
      setModalActions([homeAction, tryAgainAction]); // Home or Try Again after game over
      setShowModal(true); // Show modal for game over
    }
  };

  // Render the game grid dynamically
  const renderGrid = useCallback(() => {
    const cells = [];
    const numbersToDisplay = currentGridNumbers; // Always render from the current displayed numbers

    for (let i = 0; i < numTiles; i++) {
      const tileValue = numbersToDisplay[i];
      const isSelected = selectedTileIndex === i;
      const isChanged = (gameState === 'overall_win' || gameState === 'round_win' || gameState === 'game_over') && i === changedTileIndex;

      let cellClasses = `flex items-center justify-center p-2 rounded-lg font-bold text-2xl cursor-pointer transition-colors duration-200 ease-in-out border-2 border-gray-700`;

      // Apply styling based on game state and tile properties
      if (gameState === 'memorize_original') {
        // Tiles during observation phase: dark background, light text
        cellClasses += ' bg-gray-800 text-gray-50';
      } else if (gameState === 'odd_one_out_recall') {
        // Tiles during recall phase: blue when selected, otherwise dark
        cellClasses += isSelected ? ' bg-blue-500 text-white shadow-lg' : ' bg-gray-800 text-gray-50 hover:bg-gray-700';
      } else if (gameState === 'round_win' || gameState === 'overall_win' || gameState === 'game_over') {
        // After game ends: green for changed, red for incorrect selection, dark for others
        if (i === changedTileIndex) {
          cellClasses += ' bg-green-500 text-white animate-pulse'; // Highlight the correct changed tile
        } else if (isSelected && i !== changedTileIndex) {
          cellClasses += ' bg-red-500 text-white'; // Highlight user's incorrect selection
        } else {
          cellClasses += ' bg-gray-800 text-gray-500'; // Default for other tiles
        }
      }

      cells.push(
        <div
          key={i} // Use index as key, as tile values can change and be duplicated
          // Removed `w-full h-full` from here
          className={`${cellClasses}`}
          onClick={() => handleTileClick(i)} // Pass the tile's index to the click handler
        >
          {tileValue}
        </div>
      );
    }
    return (
      <div
        ref={gridRef}
        // Explicitly defining grid columns for robustness.
        // `max-w-2xl` for overall width, `aspect-square` for square shape.
        // `p-4` and `gap-2` for padding and spacing.
        className={`grid ${currentGridDimension === 3 ? 'grid-cols-3' : currentGridDimension === 4 ? 'grid-cols-4' : ''} gap-2 p-4 rounded-xl shadow-xl w-full max-w-2xl aspect-square
          ${gameState === 'memorize_original' ? 'bg-black bg-opacity-30' : 'bg-gray-900'}
        `}
      >
        {cells}
      </div>
    );
  }, [numTiles, currentGridNumbers, selectedTileIndex, changedTileIndex, gameState, currentGridDimension]);


  // Modal Component (unchanged)
  const Modal = ({ message, actions }) => {
    if (!showModal) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl text-white text-center border border-gray-700">
          <p className="text-3xl font-bold mb-6">{message}</p>
          <div className="flex justify-center gap-4">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-xl transform hover:-translate-y-1"
              >
                {action.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-inter flex flex-col items-center justify-center p-4">
      <Modal message={modalMessage} actions={modalActions} />

      {/* Header */}
      <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 animate-pulse">
        Odd One Out
      </h1>

      {/* Current Total Score */}
      {gameState !== 'start' && gameState !== 'difficulty' && gameState !== 'number_selection' && (
        <div className="mb-6 text-3xl font-semibold text-yellow-400">
          Total Score: {totalScore} / {TOTAL_SCORE_TO_WIN}
        </div>
      )}

      {/* Game States */}
      {gameState === 'start' && (
        <div className="flex flex-col items-center justify-center bg-gray-800 p-10 rounded-xl shadow-2xl border border-gray-700">
          <p className="text-xl mb-8 text-center text-gray-300">
            Test your observation! Find the number that changed.
          </p>
          <button
            onClick={() => setGameState('difficulty')}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-2xl transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-scale-105"
          >
            Start Game
          </button>
        </div>
      )}

      {gameState === 'difficulty' && (
        <div className="flex flex-col items-center justify-center bg-gray-800 p-10 rounded-xl shadow-2xl border border-gray-700">
          <p className="text-xl mb-8 text-center text-gray-300">
            Select Difficulty:
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => handleDifficultySelect('easy')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-xl transform hover:-translate-y-1"
            >
              Easy
            </button>
            <button
              onClick={() => handleDifficultySelect('medium')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-xl transform hover:-translate-y-1"
            >
              Medium
            </button>
            <button
              onClick={() => handleDifficultySelect('hard')}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-xl transform hover:-translate-y-1"
            >
              Hard
            </button>
          </div>
        </div>
      )}

      {gameState === 'number_selection' && (
        <div className="flex flex-col items-center justify-center bg-gray-800 p-10 rounded-xl shadow-2xl border border-gray-700">
          <p className="text-xl mb-8 text-center text-gray-300">
            Select the number of tiles (Difficulty: <span className="capitalize text-yellow-400">{difficulty}</span>):
          </p>
          <div className="flex gap-4">
            {/* Dynamically render number selection buttons based on difficulty */}
            {(() => {
              let countOptions;
              switch (difficulty) {
                case 'easy':
                  countOptions = [4, 5, 6, 7, 8];
                  break;
                case 'medium':
                  countOptions = [8, 9, 10, 11, 12];
                  break;
                case 'hard':
                  countOptions = [12, 13, 14, 15, 16];
                  break;
                default:
                  countOptions = []; // Fallback, though not expected
              }
              return countOptions.map(count => (
                <button
                  key={count}
                  onClick={() => handleNumTilesSelect(count)}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-xl transform hover:-translate-y-1"
                >
                  {count}
                </button>
              ));
            })()}
          </div>
        </div>
      )}

      {(gameState === 'memorize_original' || gameState === 'odd_one_out_recall' || gameState === 'round_win' || gameState === 'overall_win' || gameState === 'game_over') && (
        <>
          <div className="text-2xl font-semibold mb-4 text-gray-300">
            {feedbackMessage}
            {gameState === 'memorize_original' && countdown > 0 && (
              <span className="ml-2 text-yellow-300">({countdown}s)</span>
            )}
          </div>
          {renderGrid()}
          {gameState === 'odd_one_out_recall' && (
            <button
              onClick={handleSubmitRecall}
              className="mt-8 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-2xl transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-scale-105"
            >
              Submit
            </button>
          )}
          {(gameState === 'round_win' || gameState === 'overall_win' || gameState === 'game_over') && (
            <div className="flex gap-4 mt-8">
              {/* This button is now always "Home" except for overall win "New Game" */}
              {gameState === 'overall_win' ? (
                <button
                  onClick={() => { setGameState('start'); setSelectedTileIndex(null); setTotalScore(0); }}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-2xl transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-scale-105"
                >
                  New Game
                </button>
              ) : (
                <button
                  onClick={() => { setGameState('start'); setSelectedTileIndex(null); setTotalScore(0); }}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-2xl transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-scale-105"
                >
                  Home
                </button>
              )}
              {gameState === 'round_win' ? (
                <button
                  onClick={handleNextRoundOrTryAgain}
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-2xl transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-scale-105"
                >
                  Next Round
                </button>
              ) : ( // gameState === 'game_over'
                <button
                  onClick={handleNextRoundOrTryAgain}
                  className="px-8 py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold text-2xl transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-scale-105"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;
