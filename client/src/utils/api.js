import axios from 'axios';

// API helper functions

const getCookie = name => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  return parts.length === 2 ? parts.pop().split(';').shift() : undefined;
}

const fileUrl = id => `/file/${ id }/download`;

const convertDate = date => new Date(date);

const getAssignment = async id => {
  // Get assignment
  const itemResponse = await axios.get(`/item/${ id }/`);

  const { data } = itemResponse;

  // Get files
  const filesResponse = await axios.get(`/item/${ id }/files`);

  const { imageInfo, maskInfo } = filesResponse.data.reduce((info, item) => {
    item.name.includes('mask') ? info.maskInfo = item : info.imageInfo = item;
    return info;
  }, {});

  const labels = [data.meta.region_label];
  if (data.meta.added_region_ids) labels.concat(data.meta.added_region_ids);

  // Copy info and rename to be more concise
  return {
    id: data._id,
    name: data.name,
    parentId: data.baseParentId,
    description: data.description,
    coordinates: {...data.meta.coordinates},
    labels: labels.map(label => +label),
    imageId: imageInfo._id,
    maskId: maskInfo._id,
    created: convertDate(data.created),
    updated: convertDate(data.updated),
  };
};

// API

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

    const volumes = [];
    for (const volume of response.data) {
      const infoResponse = await axios.get(`/item/${ volume.id }/subvolume_info`);

      const { data } = infoResponse;

      // Copy info and rename to be more concise
      volumes.push({
        id: data.id,
        name: data.name,
        description: data.description,
        location: {...data.location},
        numRegions: data.total_regions,
        annotations: {
          active: data.total_annotation_active_regions,
          available: data.total_annotation_available_regions,
          completed: data.total_annotation_completed_regions
        },
        reviews: {
          active: data.total_review_active_regions,
          available: data.total_review_available_regions,
          approved: data.total_review_approved_regions,
          completed: data.total_review_completed_regions
        },
        rejected: data.rejected_regions
      });      
    }

    return volumes;
  },
  getAssignments: async userId => {
    const response = await axios.get(`/user/${ userId }/assignment`);

    const assignments = [];
    for (const itemId of response.data.item_ids) {
      const assignment = await getAssignment(itemId);

      assignments.push(assignment); 
    }

    return assignments;
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

    const ids = response.data.item_ids;

    if (!ids || ids.length === 0) throw new Error('No item ids');

    const assignment = await getAssignment(ids[0]);

    return assignment;
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