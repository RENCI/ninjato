import axios from 'axios';

const getCookie = name => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return undefined;
}

/*
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
*/

export const checkLogin = async () => {
  axios.defaults.headers.common['Girder-Token'] = getCookie('girderToken');

  const response = await axios.get('/user/me');

  return response.data;
}

/*
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

export const register = (username, email, firstname, lastname, password) => {
  return dispatch => {
    dispatch({
      type: REGISTER_REQUESTED
    });
    var params = new URLSearchParams();
    params.append('login', username);
    params.append('email', email)
    params.append('firstName', firstname);
    params.append('lastName', lastname)
    params.append('password', password);
    params.append('admin', false);
    return axios.post('/user',params)
    .then(response => {
      const { login, _id, authToken } = response.data;
      axios.defaults.headers.common['Girder-Token'] = authToken.token;
      dispatch({
        type: LOGIN,
        id: _id,
        login: login,
        admin: false,
      });
      dispatch({
        type: CLOSE_REGISTER_MODAL
      });
    })
    .catch(response => {
      dispatch({
        type: REGISTER_ERROR,
        message: response.response.data.message,
      });
    });
  };
};
*/