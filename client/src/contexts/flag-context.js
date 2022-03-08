import { createContext, useReducer } from 'react';
import { getCursor } from 'utils/cursor';

export const SET_FLAG = 'flag/SET_FLAG';
export const SET_COMMENT = 'flag/SET_COMMENT';
export const SET_LINK_MODE = 'flag/SET_LINK_MODE';
export const ADD_LINK = 'flag/ADD_LINK';
export const REMOVE_LINK = 'flat/REMOVE_LINK';
export const SET_SHOW_BACKGROUND = 'flag/SET_SHOW_BACKGROUND';
export const RESET = 'flag/RESET';

const editModes = [
  { value: 'add', icon: 'chain', cursor: getCursor('chain.png', 12, 23) },
  { value: 'remove', icon: 'broken chain', cursor: getCursor('broken-chain.png', 11, 23) }
];

const initialState = {
  flag: false,
  comment: '',
  linkMode: 'add',
  linkModes: linkModes,
  links: [],  
  showBackground: true
};

const reducer = (state, action) => {
  switch (action.type) {
    case SET_FLAG:
      return {
        ...state,
        flag: action.flag
      };

    case SET_COMMENT:
      return {
        ...state,
        comment: action.comment
      };

    case SET_LINK_MODE:
      return {
        ...state,
        linkMode: action.mode
      };

    case ADD_LINK:
      return {
        ...state,
        links: [
          ...links,
          action.id
        ]
      };

    case REMOVE_LINK:
      return {
        ...state,
        links: state.links.filter(id => id !== action.id)
      };

    case SET_SHOW_BACKGROUND:
      return {
        ...state,
        showBackground: action.show
      }

    case RESET:
      return {
        ...initialState
      };

    default: 
      throw new Error('Invalid Controls context action: ' + action.type);
  }
}

export const RefineContext = createContext(initialState);

export const RefineProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <RefineContext.Provider value={ [state, dispatch] }>
      { children }
    </RefineContext.Provider>
  )
} 
