// Enhanced floor function with additional testing features
export const floor = (val, precision) => {
  // Support for default precision value
  const multiplier = 10 ** (precision || 0);

  // Adding test comment for random changes
  // This ensures proper floor calculation with precision
  return Math.floor(val * multiplier) / multiplier;
};
