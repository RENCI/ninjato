import axios from 'axios';

const getCookie = name => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  return parts.length === 2 ? parts.pop().split(';').shift() : undefined;
}

const fileUrl = id => `/file/${ id }/download`;

export const api = {
  checkLogin: async () => {
    axios.defaults.headers.common['Girder-Token'] = getCookie('girderToken');

    const response = await axios.get('/user/me');

    return response.data;
  },
  login: async (username, password) => {
    const auth = 'Basic ' + window.btoa(username + ':' + password); 

    const response = await axios.get('/user/authentication', {
      headers: {
        'Girder-Authorization': auth
      }
    });

    const { authToken } = response.data;

    axios.defaults.headers.common['Girder-Token'] = authToken.token;

    return response.data.user;
  },
  logout: async () => {
    await axios.delete('/user/authentication');
  },
  register: async (username, email, firstname, lastname, password) => {
    const params = new URLSearchParams();
    params.append('login', username);
    params.append('email', email)
    params.append('firstName', firstname);
    params.append('lastName', lastname)
    params.append('password', password);
    params.append('admin', false);

    const response = await axios.post('/user', params);

    const { authToken } = response.data;

    axios.defaults.headers.common['Girder-Token'] = authToken.token;

    return response.data;
  },
  getAssignment: async id => {
    const assignmentResponse = await axios.get(`/user/${ id }/assignment`);

    const itemId = assignmentResponse.data.item_id;

    if (!itemId) return null;

    const filesResponse = await axios.get(`/item/${ itemId }/files`);

    return {
      itemId: itemId,
      imageId: filesResponse.data[0]._id,
      maskId: filesResponse.data[1]._id
    };
  },
  getData: async (imageId, maskId) => {
    const results = await Promise.all([
      axios.get(fileUrl(imageId), { responseType: 'arraybuffer' }), 
      axios.get(fileUrl(maskId), { responseType: 'arraybuffer' })      
    ]);

    return {
      imageBuffer: results[0].data,
      maskBuffer: results[1].data
    };     
  },
  getPracticeData: async () => {
    const results = await Promise.all([
      axios.get('test-data.tiff', { baseURL: '/', responseType: 'arraybuffer' }),  
      axios.get('test-masks.tiff', { baseURL: '/', responseType: 'arraybuffer' })
    ]);

    return {
      imageBuffer: results[0].data,
      maskBuffer: results[1].data
    };   
  }
};