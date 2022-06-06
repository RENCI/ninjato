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
export const REMOVE_REGION = 'user/REMOVE_REGION';
export const CLEAR_SAVE_LABELS = 'user/CLEAR_SAVE_LABELS';

const initialState = {
  id: null,
  admin: false,
  login: null,
  volumes: null,
  assignments: null,  // From server. May be stale if updating current assignment
  assignment: null,
  imageData: null,
  maskData: null,
  addedLabels: [],
  removedLabels: []
};

const addRegion = (regions, label) => {
  return [
    ...regions,
    {
      label: label,
      index: regions.length
    }
  ];
};

const removeRegion = (regions, label) => {
  return regions.filter(region => region.label !== label);
};

const updateAssignment = (a1, a2) => {
  const assignment = {
    ...a1,
    ...a2
  };

  assignment.regions = a1.regions.concat(a2.regions).reduce((regions, region) => {
    if (!regions.find(({ label }) => label === region.label)) regions.push(region);
    return regions;
  }, []);

  return assignment;
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
      };

    case SET_ASSIGNMENTS:
      return {
        ...state,
        assignments: action.assignments
      };

    case SET_ASSIGNMENT: {  
      return {
        ...state,
        assignment: action.assignment
      };
    }

    case UPDATE_ASSIGNMENT: {
      // Should be the current assignment
      if (state.assignment.id !== action.assignment.id) {
        console.warn(`Current assignment id ${ state.assignment.id } different from update id ${ action.assignment.id }`);
      }
      
      const assignment = updateAssignment(state.assignment, action.assignment);

      return {
        ...state,
        assignment: assignment
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
      return {
        ...state,
        assignment: {
          ...state.assignment,
          regions: addRegion(state.assignment.regions, action.label)
        },
        addedLabels: state.addedLabels.concat(action.label)
      };
    }

    case REMOVE_REGION: 
      return {
        ...state,
        assignment: {
          ...state.assignment,
          regions: removeRegion(state.assignment.regions, action.label)
        },
        removedLabels: state.removedLabels.concat(action.label)
      };

    case CLEAR_SAVE_LABELS:
      return {
        ...state,
        addedLabels: [],
        removedLabels: []
      };

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
