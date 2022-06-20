export const history = () => {
  let history = [];
  let index = -1;
  let saveIndex = 0;

  return {
    push: item => {
      history.splice(index + 1);
      history.push(item);
      index = history.length - 1;
    },
    undo: () => {      
      index = Math.max(0, index - 1);
      return history[index];
    },
    redo: () => {
      index = Math.min(history.length -1, index + 1);
      return history[index];
    },
    set: items => {
      history = [items];
      index = 0;
    },
    clear: () => {
      history = [];
      index = -1;
      saveIndex = 0;
    },
    updateSaveIndex: () => saveIndex = index,
    getCurrent: () => history.length > 0 ? history[index] : [],
    getLastSave: () => history.length > 0 ?  history[saveIndex] : [],
    getHistory: () => history
  };
}