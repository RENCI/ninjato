import React, { createContext, useReducer } from "react";

export const LOGIN = 'user/LOGIN';
export const LOGOUT = 'user/LOGOUT';
export const SET_ASSIGNMENT = 'user/SET_ASSIGNMENT';

const initialState = {
  id: null,
  admin: false,
  login: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case LOGIN:
      return {
        ...state,
        id: action.id,
        login: action.login,
        admin: action.admin
      };

    case LOGOUT:
      return {
        ...state,
        id: null,
        login: null,
        admin: false,
      };

    case SET_ASSIGNMENT:
      return {
        ...state,
        // XXX: DO STUFF
      };

    default: 
      throw new Error("Invalid user context action: " + action.type);
  }
}

export const UserContext = createContext(initialState);

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <UserContext.Provider value={ [state, dispatch] }>
      { children }
    </UserContext.Provider>
  )
} 
