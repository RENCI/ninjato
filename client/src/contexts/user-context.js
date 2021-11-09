import React, { createContext, useReducer } from "react";

export const LOGIN_REQUESTED = 'user/LOGIN_REQUESTED';
export const LOGIN = 'user/LOGIN';
export const LOGIN_ERROR = 'user/LOGIN_ERROR';
export const LOGOUT_REQUESTED = 'user/LOGOUT_REQUESTED';
export const LOGOUT = 'user/LOGOUT';
export const OPEN_LOGIN_MODAL = 'user/OPEN_LOGIN_MODAL';
export const CLOSE_LOGIN_MODAL = 'user/CLOSE_LOGIN_MODAL';
export const REGISTER = 'user/REGISTER';
export const REGISTER_REQUESTED = 'user/REGISTER_REQUESTED';
export const REGISTER_ERROR = 'user/REGISTER_ERROR';
export const OPEN_REGISTER_MODAL = 'user/OPEN_REGISTER_MODAL';
export const CLOSE_REGISTER_MODAL = 'user/CLOSE_REGISTER_MODAL'; 

const initialState = {
  id: null,
  admin: false,
  login: null,
  loginErrorMessage: null,
//  register: null,
  registerErrorMessage: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case "setTasks":
      return {
        ...state,
        tasks: action.tasks
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
