import axios from 'axios';

// API helper functions

const getCookie = name => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  return parts.length === 2 ? parts.pop().split(';').shift() : undefined;
}

const fileUrl = id => `/file/${ id }/download`;

const convertDate = date => new Date(date);

const getAssignment = async (subvolumeId, itemId, assignmentKey) => {
  const infoResponse = await axios.get(`/item/${ subvolumeId }/subvolume_assignment_info`, {
    params: {
      assignment_key: assignmentKey
    }
  }); 

  console.log(infoResponse);

  /*
  // Get assignment
  const itemResponse = await axios.get(`/item/${ id }`);

  const { data } = itemResponse;

  // Get files
  const filesResponse = await axios.get(`/item/${ id }/files`);

  const { imageInfo, maskInfo } = filesResponse.data.reduce((info, item) => {
    item.name.includes('mask') ? info.maskInfo = item : info.imageInfo = item;
    return info;
  }, {});

  const labels = [data.meta.region_label];
  if (data.meta.added_region_ids) labels.concat(data.meta.added_region_ids);

  console.log(data);

  // Get label info

  const labelInfo = [];
  for (const label of labels) {
    const response = await axios.get(`/item/${ data._id }/subvolume_assignment_info`, {
      params: {
        region_label: label
      }
    });

    console.log(response);
  }


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
  */
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
    console.log("DL:FKJSDL:FJSDF");

    console.log(userId);

    const response = await axios.get(`/user/${ userId }/assignment`);

    console.log(response);

    const assignments = [];
    for (const item of response.data) {
      const assignment = await getAssignment(item.subvolume_id, item.item_id, item.assignment_key);

      assignments.push(assignment); 
    }

    return assignments;
  },
  getNewAssignment: async (userId, volumeId) => {
    const response = await axios.get(`/user/${ userId }/assignment`,
      {
        params: {
          subvolume_id: volumeId
        }
      }
    );

    if (response.data.length === 0) throw new Error('No new assignment');

    const item = response.data[0];

    const assignment = await getAssignment(item.subvolume_id, item.item_id, item.assignment_key);

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