// ELO Rating Calculation
// Default K-factor for rating changes
const K_FACTOR = 32;

/**
 * Calculate expected score for a player
 * @param {number} playerRating - Player's current rating
 * @param {number} opponentRating - Opponent's current rating
 * @returns {number} Expected score (0-1)
 */
function getExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate new ELO rating after a game
 * @param {number} currentRating - Player's current rating
 * @param {number} opponentRating - Opponent's rating
 * @param {number} actualScore - Actual game result (1 = win, 0.5 = draw, 0 = loss)
 * @returns {number} New rating
 */
export function calculateNewRating(currentRating, opponentRating, actualScore) {
  const expectedScore = getExpectedScore(currentRating, opponentRating);
  const ratingChange = K_FACTOR * (actualScore - expectedScore);
  return Math.round(currentRating + ratingChange);
}

/**
 * Calculate rating changes for both players
 * @param {number} whiteRating - White player's rating
 * @param {number} blackRating - Black player's rating
 * @param {string} result - Game result ('white', 'black', or 'draw')
 * @returns {Object} New ratings for both players
 */
export function calculateRatingChanges(whiteRating, blackRating, result) {
  let whiteScore, blackScore;
  
  if (result === 'white') {
    whiteScore = 1;
    blackScore = 0;
  } else if (result === 'black') {
    whiteScore = 0;
    blackScore = 1;
  } else {
    whiteScore = 0.5;
    blackScore = 0.5;
  }
  
  const newWhiteRating = calculateNewRating(whiteRating, blackRating, whiteScore);
  const newBlackRating = calculateNewRating(blackRating, whiteRating, blackScore);
  
  return {
    whiteRating: newWhiteRating,
    blackRating: newBlackRating,
    whiteChange: newWhiteRating - whiteRating,
    blackChange: newBlackRating - blackRating
  };
}