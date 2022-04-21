import axios from 'axios';

// API helper functions

const getCookie = name => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  return parts.length === 2 ? parts.pop().split(';').shift() : undefined;
}

const fileUrl = id => `/file/${ id }/download`;

const convertDate = date => new Date(date);

const getStatus = info => (
  info.review_completed_by !== '' ? 'completed' :
  info.review_assigned_to !== '' ? 'review' :
  info.annotation_completed_by !== '' ? 'waiting' :
  'active'
);

const getAssignment = async (itemId, subvolumeId, assignmentKey) => {
  // Get assignment info
  const infoResponse = await axios.get(`/item/${ subvolumeId }/subvolume_assignment_info`, {
    params: {
      assignment_key: assignmentKey
    }
  }); 

  const info = infoResponse.data;

  console.log(info);

  // Get files
  const filesResponse = await axios.get(`/item/${ itemId }/files`);

  const { imageInfo, maskInfo } = filesResponse.data.reduce((info, item) => {
    item.name.includes('mask') ? info.maskInfo = item : info.imageInfo = item;
    return info;
  }, {});

  // Copy info and rename to be more concise
  return {
    id: itemId,
    subvolumeId: subvolumeId,
    assignmentKey: assignmentKey,
    name: info.name,
    description: info.description,
    updated: convertDate(info.last_updated_time),
    location: {...info.location},
    regions: info.regions.map(region => ({
      ...region,
      label: +region.label
    })),
    status: getStatus(info),
    statusInfo: {
      assignedTo: info.annotation_assigned_to,
      completedBy: info.annotation_completed_by,
      rejectedBy: info.annotation_rejected_by,
      reviewAssignedTo: info.review_assigned_to,
      reviewCompletedBy: info.review_completed_by,
      reviewRejectedBy: info.review_rejected_by
    },
    imageId: imageInfo._id,
    maskId: maskInfo._id
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
    const assignmentResponse = await axios.get(`/user/${ userId }/assignment`);
    const reviewResponse = await axios.get(`/user/${ userId }/assignment_await_review`);

    const assignments = [];
    for (const item of assignmentResponse.data.concat(reviewResponse.data)) {
      const assignment = await getAssignment(item.item_id, item.subvolume_id, item.assignment_key);

      assignments.push(assignment); 
    }

    return assignments;
  },
  getNewAssignment: async (userId, subvolumeId) => {
    const response = await axios.get(`/user/${ userId }/assignment`,
      {
        params: {
          subvolume_id: subvolumeId
        }
      }
    );

    if (response.data.length === 0) throw new Error('No new assignment');

    const item = response.data[0];

    const assignment = await getAssignment(item.item_id, item.subvolume_id, item.assignment_key);

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
  },
  claimRegion: async (userId, subvolumeId, label) => {
    await axios.post(`/user/${ userId }/claim_assignment`, null, {
      params: {
        subvolume_id: subvolumeId,
        claim_region_id: label
      }
    });
  }
};