import { createContext, useReducer } from "react";

export const SET_LOADING = 'loading/SET_LOADING_MESSAGE';
export const CLEAR_LOADING = 'loading/CLEAR_LOADING';

const initialState = {
  message: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case SET_LOADING:
      return {
        ...state,
        message: action.message ? action.message : 'Loading' 
      };

    case CLEAR_LOADING:
      return {
        ...state,
        message: null
      };

    default: 
      throw new Error("Invalid loading context action: " + action.type);
  }
}

export const LoadingContext = createContext(initialState);

export const LoadingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <LoadingContext.Provider value={ [state, dispatch] }>
      { children }
    </LoadingContext.Provider>
  )
} 
