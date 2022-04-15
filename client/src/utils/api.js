import axios from 'axios';
import { AssignmentMessage } from 'modules/common/components/assignment-message';

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
  getVolumes: async () => {
    const response = await axios.get('/system/subvolume_ids');

    console.log(response);

    const volumes = [];
    for (const volume of response.data) {
      const infoResponse = await axios.get(`/item/${ volume.id }/subvolume_info`);

      console.log(infoResponse);

      // Copy info and rename to be more concise
      volumes.push({
        id: infoResponse.data.item_id,
        description: infoResponse.data.item_description,
        total: infoResponse.data.total_regions,
        active: infoResponse.data.total_regions_at_work,
        completed: infoResponse.data.total_regions_done,
      });      
    }

    return volumes;
  },
  getAssignments: async userId => {
    const response = await axios.get(`/user/${ userId }/assignment`);

    console.log(response);

    for (const itemId of response.data.item_ids) {
      const itemResponse = await axios.get(`/item/${ itemId }/`);

      console.log(itemResponse);
    }

    /*

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
    */
  },
  getNewAssignment: async (userId, volumeId) => {
    const response = await axios.get(`/user/${ userId }/assignment`,
      null,
      {
        params: {
          subvolume_id: volumeId
        }
      }
    );

    console.log(response);
  },
  declineAssignment: async (userId, itemId) => {
    await axios.post(`/user/${ userId }/annotation`,
      null,
      {
        params: {
          item_id: itemId,
          reject: true
        }
      }
    );
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
      axios.get('test-data.tiff', { baseURL: '/data/', responseType: 'arraybuffer' }),  
      axios.get('test-masks.tiff', { baseURL: '/data/', responseType: 'arraybuffer' })
    ]);

    return {
      imageBuffer: responses[0].data,
      maskBuffer: responses[1].data
    };   
  },
  saveAnnotations: async (userId, itemId, buffer, done = false) => {
    const blob = new Blob([buffer], { type: 'image/tiff' });

    // Set data form data
    const formData = new FormData();
    formData.append('content_data', blob);

    await axios.post(`/user/${ userId }/annotation`, 
      formData,
      {
        params: { 
          item_id: itemId,
          done: done,
          comment: ''
        },
        headers: { 
          'Content-Type': 'multipart/form-data' 
        }
      }
    );
  }
};