let storeInstance = null;
export const setStore = (store) => {
  storeInstance = store;
};
export const getStore = () => {
  if (!storeInstance) {
    throw new Error("Store is not ready yet!");
  }
  return storeInstance;
};
