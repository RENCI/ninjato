import { createContext, useReducer } from 'react';
import { history } from 'utils/history';
import { updateColors } from 'utils/colors';

export const LOGIN = 'user/LOGIN';
export const LOGOUT = 'user/LOGOUT';
export const SET_VOLUMES = 'user/SET_VOLUMES';
export const SET_ASSIGNMENTS = 'user/SET_ASSIGNMENTS';
export const SET_AVAILABLE_REVIEWS = 'user/SET_AVAILABLE_REVIEWS';
export const SET_ASSIGNMENT = 'user/SET_ASSIGNMENT';
export const UPDATE_ASSIGNMENT = 'user/UPDATE_ASSIGNMENT';
export const SET_DATA = 'user/SET_DATA';
export const CLEAR_DATA = 'user/CLEAR_DATA';
export const SET_ACTIVE_REGION = 'user/SET_ACTIVE_REGION';
export const ADD_REGION = 'user/ADD_REGION';
export const REMOVE_REGION = 'user/REMOVE_REGION';
export const REMOVE_REGIONS = 'user/REMOVE_REGIONS';
export const SET_BACKGROUND_REGIONS = 'user/SET_BACKGROUND_REGIONS';
export const CLEAR_SAVE_LABELS = 'user/CLEAR_SAVE_LABELS';
export const PUSH_REGION_HISTORY = 'user/PUSH_REGION_HISTORY';
export const UNDO_REGION_HISTORY = 'user/UNDO_REGION_HISTORY';
export const REDO_REGION_HISTORY = 'user/REDO_REGION_HISTORY';
export const SAVE_REGION_HISTORY = 'user/SAVE_REGION_HISTORY';
export const SET_REGION_COMMENT = 'user/SET_REGION_COMMENT';
export const SET_COMMENTS = 'user/SET_COMMENTS';
 
const initialState = {
  user: null,
  volumes: null,
  assignments: null,  // From server. May be stale if updating current assignment
  availableReviews: null,
  assignment: null,
  imageData: null,
  maskData: null,
  activeRegion: null,
  regionHistory: history()
};

const createRegion = (regions, label) => {
  const newRegions = [
    ...regions,
    {
      label: label,
      index: regions.length
    }
  ];

  updateColors(newRegions);

  return newRegions;
};

const removeRegions = (regions, remove) => {
  const labels = remove.map(({ label }) => label);
  return regions.filter(region => !labels.includes(region.label));
};

const updateAssignment = (a1, a2) => {
  const assignment = {
    ...a1,
    ...a2
  };

  updateColors(assignment.regions);

  return assignment;
};

const reducer = (state, action) => {
  switch (action.type) {
    case LOGIN:
      return {
        ...initialState,
        user: action.user
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

    case SET_AVAILABLE_REVIEWS:
      return {
        ...state,
        availableReviews: action.availableReviews
      };

    case SET_ASSIGNMENT: {  
      const { regions } = action.assignment;

      // Assuming active region is the first here...
      state.regionHistory.set({ 
        regions: regions, 
        activeRegion: regions.length > 0 ? regions[0] : null
      });
      updateColors(regions);

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

      const { regions } = assignment;
      
      state.regionHistory.set({ 
        regions: regions,
        activeRegion: regions.length > 0 ? regions[regions.length - 1] : null
      });

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
        assignment: null,
        imageData: null,
        maskData: null
      };

    case SET_ACTIVE_REGION: 
      return { 
        ...state,
        activeRegion: action.region
      }

    case ADD_REGION: {
      const regions = createRegion(state.assignment.regions, action.label);     
      const activeRegion = action.makeActive ? 
        regions.find(({ label }) => label === action.makeActive) : 
        regions[regions.length - 1];

      state.regionHistory.push(({ 
        regions: regions,
        activeRegion: activeRegion
      }));

      return {
        ...state,
        assignment: {
          ...state.assignment,
          regions: regions
        },
        activeRegion: activeRegion
      };
    }

    case REMOVE_REGION: {
      const regions = removeRegions(state.assignment.regions, [action.region]);

      let activeRegion = state.activeRegion;
      if (state.activeRegion === action.region) {
        activeRegion = regions.length > 0 ? regions[0] : null;
      }

      state.regionHistory.push(({ 
        regions: regions,
        activeRegion: activeRegion
      }));

      return {
        ...state,
        assignment: {
          ...state.assignment,
          regions: regions
        },
        activeRegion: activeRegion
      };
    }

    case REMOVE_REGIONS: 
      return {
        ...state,
        assignment: {
          ...state.assignment,
          regions: removeRegions(state.assignment.regions, action.regions)
        }
      };

    case SET_BACKGROUND_REGIONS: 
      return {
        ...state,
        assignment: {
          ...state.assignment,
          backgroundRegions: action.regions
        }
      };

    case CLEAR_SAVE_LABELS:
      return {
        ...state,
        addedLabels: [],
        removedLabels: []
      };

    case PUSH_REGION_HISTORY:
      state.regionHistory.push({ 
        regions: state.assignment.regions, 
        activeRegion: action.activeRegion
      });

      return state;

    case UNDO_REGION_HISTORY: {
      const item = state.regionHistory.undo();

      const newState = {
        ...state,
        assignment: {
          ...state.assignment,
          regions: item.regions
        },
        activeRegion: item.activeRegion
      };

      return newState;
    }

    case REDO_REGION_HISTORY: {
      const item = state.regionHistory.redo();

      const newState = {
        ...state,
        assignment: {
          ...state.assignment,
          regions: item.regions
        },
        activeRegion: item.activeRegion
      };

      return newState;
    }

    case SAVE_REGION_HISTORY:
      state.regionHistory.updateSaveIndex()

      return state;
      
    case SET_REGION_COMMENT: {
      const regions = state.assignment.regions;

      const index = regions.findIndex(({ label }) => label === action.region.label);

      if (index === -1) return state;

      regions[index] = {
        ...regions[index],
        comment: action.comment
      }

      return {
        ...state,
        assignment: {
          ...state.assignment,
          regions: [...regions]
        }
      };
    }

    case SET_COMMENTS: {
      const regions = [...state.assignment.regions];

      regions.forEach(region => {
        region.comments = action.comments[region.label];
        region.comment = null;
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
