import axios from 'axios';

export const LOGIN_REQUESTED = 'user/LOGIN_REQUESTED';
export const LOGIN = 'user/LOGIN';
export const LOGIN_ERROR = 'user/LOGIN_ERROR';
export const LOGOUT_REQUESTED = 'user/LOGOUT_REQUESTED';
export const LOGOUT = 'user/LOGOUT';
export const OPEN_LOGIN_MODAL = 'user/OPEN_LOGIN_MODAL';
export const CLOSE_LOGIN_MODAL = 'user/CLOSE_LOGIN_MODAL';

const initialState = {
  id: null,
  admin: false,
  login: null,
  loginErrorMessage: null,
  loginModalOpen: false,
  isLoggingIn: false,
  isLoggingOut: false,
};

// eslint-disable-next-line
export default (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_REQUESTED:
      return {
        ...state,
        isLoggingIn: true,
        loginErrorMessage: null,
      };

    case LOGIN:
      return {
        ...state,
        admin: action.admin,
        login: action.login,
        id: action.id,
        isLoggingIn: false,
        loginErrorMessage: null,
      };

    case LOGIN_ERROR:
      return {
        ...state,
        isLoggingIn: false,
        loginErrorMessage: action.message,
      };

    case LOGOUT_REQUESTED:
      return {
        ...state,
        isLoggingOut: true,
      };

    case LOGOUT:
      return {
        ...state,
        admin: false,
        id: null,
        login: null,
        isLoggingOut: false,
      };

    case OPEN_LOGIN_MODAL:
      return {
        ...state,
        loginModalOpen: true,
      };

    case CLOSE_LOGIN_MODAL:
      return {
        ...state,
        loginModalOpen: false,
      };

    default:
      return state
  }
};

export const openLoginModal = () => {
  return {
    type: OPEN_LOGIN_MODAL
  };
};

export const closeLoginModal = () => {
  return {
    type: CLOSE_LOGIN_MODAL
  };
};

const getCookie = name => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return undefined;
}

export const checkLogin = () => {
  return dispatch => {
    axios.defaults.headers.common['Girder-Token'] = getCookie('girderToken');
    return axios.get('/user/me')
    .then(response => {
      const user = response.data;
      if (user) {
        dispatch({
          type: LOGIN,
          id: user._id,
          login: user.login,
          admin: user.admin,
        });
      }
    });
  };
};

export const login = (username, password) => {
  return dispatch => {
    dispatch({
      type: LOGIN_REQUESTED
    });
    const auth = 'Basic ' + window.btoa(username + ':' + password);
    return axios.get('/user/authentication', {
      headers: {
        'Girder-Authorization': auth,
      },
    })
    .then(response => {
      const { user, authToken } = response.data;
      axios.defaults.headers.common['Girder-Token'] = authToken.token;
      dispatch({
        type: LOGIN,
        id: user._id,
        login: user.login,
        admin: user.admin,
      });
      dispatch({
        type: CLOSE_LOGIN_MODAL
      });
    })
    .catch(response => {
      dispatch({
        type: LOGIN_ERROR,
        message: response.response.data.message,
      });
    });
  };
};

export const logout = () => {
  return dispatch => {
    dispatch({
      type: LOGOUT_REQUESTED
    });

    return axios.delete('/user/authentication').then(result => {
      dispatch({
        type: LOGOUT
      });
    });
  };
};
