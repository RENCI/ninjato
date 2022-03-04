import { createContext, useReducer } from "react";

export const LOGIN = 'user/LOGIN';
export const LOGOUT = 'user/LOGOUT';
export const SET_ASSIGNMENT = 'user/SET_ASSIGNMENT';


const stages =[
  'flag',
  'group',
  'split',
  'refine'
];

const volumes = [
  {
    name: 'test 1',
    stage: 'flag',
    assignments: [
      {
        type: 'flag',
        id: 0,
        status: 'completed'
      },
      {
        type: 'flag',
        id: 1,
        status: 'active'
      },
      {
        type: 'flag',
        id: 2,
        status: 'available'
      }
    ]
  },
  {
    name: 'test 2',
    stage: 'refine',
    assignments: [
      {
        type: 'refine',
        id: 0,
        status: 'completed'
      },
      {
        type: 'refine',
        id: 1,
        status: 'active'
      },
      {
        type: 'refine',
        id: 2,
        status: 'available'
      }
    ]
  },
  {
    name: 'test 3',
    stage: 'flag',
    assignments: [
      {
        type: 'flag',
        id: 0,
        status: 'completed'
      },
      {
        type: 'flag',
        id: 1,
        status: 'active'
      }
    ]
  },
  {
    name: 'test 4',
    stage: 'flag',
    assignments: [
      {
        type: 'flag',
        id: 0,
        status: 'completed'
      },
      {
        type: 'flag',
        id: 1,
        status: 'completed'
      },
      {
        type: 'flag',
        id: 2,
        status: 'available'
      }
    ]
  },
  {
    name: 'test 5',
    stage: 'refine',
    assignments: [
      {
        type: 'refine',
        id: 0,
        status: 'active'
      },
      {
        type: 'flag',
        id: 1,
        status: 'active'
      },
      {
        type: 'refine',
        id: 2,
        status: 'active'
      }
    ]
  } 
];

const initialState = {
  id: null,
  admin: false,
  login: null,
  stages: stages,
  volumes: volumes, 
  assigment: null
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
        assignment: action.assignment
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
