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
  'active'
  /*
  info.review_completed_by !== '' ? 'completed' :
  info.review_assigned_to !== '' ? 'review' :
  info.annotation_completed_by !== '' ? 'waiting' :
  'active'
  */
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

  // Get region comments
  const comments = {};
  for (const { label } of info.regions) {
    const result = await axios.get(`/item/${ itemId }/region_comments`, { 
      params: {
        region_label: label 
      }
    });

    console.log(comments);

    comments[label] = result.data;
  };

  console.log(comments);

  // Copy info and rename to be more concise
  return {
    id: itemId,
    subvolumeId: subvolumeId,
    assignmentKey: assignmentKey,
    name: info.name,
    description: info.description,
    updated: convertDate(info.last_updated_time),
    location: {...info.location},
    regions: info.regions.map((region, i) => ({
      ...region,
      label: +region.label,
      comments: comments[region.label],
      index: i
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
    maskId: maskInfo._id,
    type: 'refine'
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
      try {
        const infoResponse = await axios.get(`/item/${ volume.id }/subvolume_info`);

console.log(infoResponse);

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
          sliceRanges: data.intensity_ranges.map(({ min, max }) => [min, max]),
          history: data.history
        });      
      }      
      catch (error) {
        console.log(error);
      }
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
    const response = await axios.post(`/user/${ userId }/annotation`,
      null,
      {
        params: {
          item_id: itemId,
          reject: true
        }
      }
    );

    return response.data;
  },
  updateAssignment: async (userId, subvolumeId, assignmentKey) => {
    const assignment = await getAssignment(userId, subvolumeId, assignmentKey);

    console.log(assignment);

    return assignment;
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
  saveAnnotations: async (userId, itemId, buffer, regions, addedLabels, removedLabels, done = false) => {
    const blob = new Blob([buffer], { type: 'image/tiff' });

    const stringify = ids => JSON.stringify(ids.map(id => id.toString()));

    // Set form data
    const formData = new FormData();
    formData.append('added_region_ids', stringify(addedLabels));
    formData.append('removed_region_ids', stringify(removedLabels));
    formData.append('content_data', blob);    

    await axios.post(`/user/${ userId }/annotation`, 
      formData,
      {
        params: { 
          item_id: itemId,
          comment: regions.reduce((comments, region) => {
            return {
              ...comments,
              [region.label]: region.comment
            }
          }, {}),
          done: done
        },
        headers: { 
          'Content-Type': 'multipart/form-data' 
        }
      }
    );
  },
  claimRegion: async (userId, subvolumeId, assignmentId, label) => {
    const response = await axios.post(`/user/${ userId }/claim_assignment`, null, {
      params: {
        subvolume_id: subvolumeId,
        active_assignment_id: assignmentId,
        claim_region_id: label
      }
    });

    if (response.data.status !== 'success') throw new Error(`Error adding region ${ label }`);

    return response.data;
  },
  removeRegion: async (userId, subvolumeId, assignmentId, label) => {
    const response = await axios.post(`/user/${ userId }/remove_region_from_assignment`, null, {
      params: {
        subvolume_id: subvolumeId,
        active_assignment_id: assignmentId,
        region_id: label
      }
    });

    if (response.data.status !== 'success') throw new Error(`Error removing region ${ label }`);

    return response.data.assignment_region_key;
  },
  getNewLabel: async subvolumeId => {
    const response = await axios.get(`/item/${ subvolumeId }/new_region_ids`, {
      params: {
        split_region_count: 1
      }
    });

    if (response.data.length === 0) throw new Error('No new region label returned');
    else if (response.data.length > 1) console.warn(`${ response.data.length } new region labels returned (should only be 1)`);

    return response.data[0];
  }
};