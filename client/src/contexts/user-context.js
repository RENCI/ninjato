import { createContext, useReducer } from "react";

export const LOGIN = 'user/LOGIN';
export const LOGOUT = 'user/LOGOUT';
export const SET_VOLUMES = 'user/SET_VOLUMES';
export const SET_ASSIGNMENT = 'user/SET_ASSIGNMENT';
export const SET_ASSIGNMENT_TYPE = 'user/SET_ASSIGNMENT_TYPE';

const initialState = {
  id: null,
  admin: false,
  login: null,
  volumes: [], 
  assignment: null
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

    case SET_VOLUMES:
      return {
        ...state,
        volumes: action.volumes
      }

    case SET_ASSIGNMENT:
      return {
        ...state,
        assignment: action.assignment
      };

    case SET_ASSIGNMENT_TYPE:
      return {
        ...state,
        assignment: {
          ...state.assignment,
          type: action.assignmentType
        }
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
