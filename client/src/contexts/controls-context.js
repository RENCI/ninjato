import { createContext, useReducer } from "react";

export const SET_EDIT_MODE = 'controls/EDIT_MODE';
export const RESET = 'controls/RESET';

const initialState = {
  editMode: 'paint'
};

const reducer = (state, action) => {
  switch (action.type) {
    case SET_EDIT_MODE:
      return {
        ...state,
        editMode: action.mode
      };

    case RESET:
      return {
        ...initialState
      };

    default: 
      throw new Error("Invalid Controls context action: " + action.type);
  }
}

export const ControlsContext = createContext(initialState);

export const ControlsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <ControlsContext.Provider value={ [state, dispatch] }>
      { children }
    </ControlsContext.Provider>
  )
} 
