export const OPEN_MODAL = 'modal/OPEN_MODAL';
export const CLOSE_MODAL = 'modal/CLOSE_MODAL';

const initialState = {
  openModal: null,
};

// eslint-disable-next-line
export default (state = initialState, action) => {
  switch (action.type) {
    case OPEN_MODAL:
      return {
        ...state,
        openModal: action.modalName,
      };
    case CLOSE_MODAL:
      return initialState;
    default:
      return state;
  }
};

export const openModal = modalName => {
  return {
    type: OPEN_MODAL,
    modalName,
  };
};

export const closeModal = () => {
  return {
    type: CLOSE_MODAL,
  };
};

