import { createContext, useReducer } from "react";

export const SET_DATA = 'data/LOGIN';
export const CLEAR_DATA = 'data/LOGOUT';

const initialState = {
  imageData: null,
  maskData: null,
  label: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case SET_DATA:
      return {
        ...state,
        imageData: action.imageData,
        maskData: action.maskData,
        label: action.label
      };

    case CLEAR_DATA:
      return {...initialState};

    default: 
      throw new Error("Invalid data context action: " + action.type);
  }
}

export const DataContext = createContext(initialState);

export const DataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <DataContext.Provider value={ [state, dispatch] }>
      { children }
    </DataContext.Provider>
  )
} 
