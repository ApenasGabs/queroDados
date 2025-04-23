export const delay = async (delay = 1000) => {
  return await new Promise((resolve) => setTimeout(resolve, delay));
};
