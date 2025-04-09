/**
 * Compare user IDs in reactions with the current user ID
 * Handles different formats of user IDs (string vs object)
 * @param {String|Object} reactionUser - The user in the reaction
 * @param {String} currentUserId - The current user's ID
 * @returns {Boolean} - Whether the IDs match
 */
export const isCurrentUserReaction = (reactionUser, currentUserId) => {
  if (!reactionUser || !currentUserId) return false;
  
  // Debug log
  console.log('Comparing reaction user with current user:', {
    reactionUser: typeof reactionUser === 'object' ? reactionUser : reactionUser,
    currentUserId
  });
  
  // Convert to strings for consistent comparison
  const currentUserIdStr = String(currentUserId);
  
  // Handle different formats of user ID
  if (typeof reactionUser === 'string') {
    return reactionUser === currentUserIdStr;
  } 
  
  if (reactionUser._id) {
    return String(reactionUser._id) === currentUserIdStr;
  }

  if (reactionUser.id) {
    return String(reactionUser.id) === currentUserIdStr;
  }
  
  return false;
}; 