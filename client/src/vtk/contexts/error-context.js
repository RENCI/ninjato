import { createContext, useReducer } from "react";

export const SET_ERROR = 'error/SET_ERROR';
export const CLEAR_ERROR = 'error/CLEAR_ERROR';

const initialState = {
  error: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case SET_ERROR:
      return {
        ...state,
        error: action.error
      };

    case CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default: 
      throw new Error("Invalid error context action: " + action.type);
  }
}

export const ErrorContext = createContext(initialState);

export const ErrorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <ErrorContext.Provider value={ [state, dispatch] }>
      { children }
    </ErrorContext.Provider>
  )
} 
