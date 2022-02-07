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
    const label = +assignmentResponse.data.region_label;

    if (!itemId) return null;

    const filesResponse = await axios.get(`/item/${ itemId }/files`);

    const { imageInfo, maskInfo } = filesResponse.data.reduce((info, item) => {
      item.name.includes('mask') ? info.maskInfo = item : info.imageInfo = item;
      return info;
    }, {});

    return {
      itemId: itemId,
      imageId: imageInfo._id,
      maskId: maskInfo._id,
      label: label
    };
  },
  getData: async (imageId, maskId) => {
    const responses = await Promise.all([
      axios.get(fileUrl(imageId), { responseType: 'arraybuffer' }), 
      axios.get(fileUrl(maskId), { responseType: 'arraybuffer' })      
    ]);

    return {
      imageBuffer: responses[0].data,
      maskBuffer: responses[1].data
    };     
  },
  getPracticeData: async () => {
    const responses = await Promise.all([
      axios.get('test-data.tiff', { baseURL: '/', responseType: 'arraybuffer' }),  
      axios.get('test-masks.tiff', { baseURL: '/', responseType: 'arraybuffer' })
    ]);

    return {
      imageBuffer: responses[0].data,
      maskBuffer: responses[1].data
    };   
  },
  saveAnnotations: async (userId, itemId, data, done = false) => {
    // Set data and parameters as form data
    const formData = new FormData();
    formData.append('id', userId);
    formData.append('item_id', itemId);
    formData.append('done', done);
    formData.append('comment', '');
    formData.append('content_data', data);

    await axios.post(`/user/${ userId }/annotation`, 
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
  }
};