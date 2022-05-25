import { createContext, useReducer } from 'react';

export const LOGIN = 'user/LOGIN';
export const LOGOUT = 'user/LOGOUT';
export const SET_VOLUMES = 'user/SET_VOLUMES';
export const SET_ASSIGNMENTS = 'user/SET_ASSIGNMENTS';
export const SET_ASSIGNMENT = 'user/SET_ASSIGNMENT';
export const UPDATE_ASSIGNMENT = 'user/UPDATE_ASSIGNMENT';
export const SET_DATA = 'user/SET_DATA';
export const CLEAR_DATA = 'user/CLEAR_DATA';
export const ADD_REGION = 'user/ADD_REGION';

const initialState = {
  id: null,
  admin: false,
  login: null,
  volumes: null,
  assignments: null, 
  assignment: null,
  imageData: null,
  maskData: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case LOGIN:
      return {
        ...initialState,
        id: action.id,
        login: action.login,
        admin: action.admin
      };

    case LOGOUT:
      return {
        ...initialState
      };    

    case SET_VOLUMES:
      return {
        ...state,
        volumes: action.volumes
      }

    case SET_ASSIGNMENTS:
      return {
        ...state,
        assignments: action.assignments
      };

    case SET_ASSIGNMENT:
      console.log(action.assignment);
      return {
        ...state,
        assignment: {
          ...action.assignment,
          type: action.assignmentType
        }
      };

    case UPDATE_ASSIGNMENT: {
      const assignments = [...state.assignments];

      const index = assignments.findIndex(({ id }) => id === action.assignment.id);
      const isActive = state.assignment.id === action.assignment.id;

      if (index === -1) {
        console.warn(`Could not find assignment ${ action.assignment.id }`);

        if (!isActive) return state;
      }

      const update = {};

      if (index !== -1) {
        update.assignments = [...state.assignments];
        update.assignments[index] = {
          ...update.assignments[index],
          ...action.assignment
        };
      }

      if (isActive) {
        update.assignment = {
          ...state.assignment,
          ...action.assignment
        };
      }

      return {
        ...state,
        ...update
      };
    };

    case SET_DATA:
      return {
        ...state,
        imageData: action.imageData,
        maskData: action.maskData
      };

    case CLEAR_DATA:
      return {
        ...state,
        imageData: null,
        maskData: null
      };

    case ADD_REGION: {
      const regions = state.assignment.regions;
      regions.push({
        label: action.label,
        index: regions.length
      });

      return {
        ...state,
        assignment: {
          ...state.assignment,
          regions: regions
        }
      }
    }

    default: 
      throw new Error(`Invalid user context action: ${ action.type }`);
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
