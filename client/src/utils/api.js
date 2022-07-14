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
  info.status === 'awaiting review' ? 'waiting' :
  info.status === 'under review' ? 'review' :
  info.status === 'completed' ? 'completed' :
  'active'
);

const addUserInfo = async user => {
  user.reviewer = false;
  for (const group of user.groups) {
    const response = await axios.get(`/group/${ group }`);

    if (response.data.name === 'reviewers') {
      user.reviewer = true;
      break;
    }
  }

  return user;
};

const getAssignment = async (subvolumeId, itemId, regionId = null) => {
  // Get assignment info
  const infoResponse = await axios.get(`/item/${ subvolumeId }/subvolume_assignment_info`, {
    params: itemId ? { assign_item_id: itemId } : regionId ? { region_id: regionId } : {}    
  }); 

  const info = infoResponse.data;

  // Get files
  const filesResponse = await axios.get(`/item/${ itemId }/files`);

  const { imageInfo, maskInfo } = filesResponse.data.reduce((info, item) => {
    item.name.includes('mask') ? info.maskInfo = item : info.imageInfo = item;
    return info;
  }, {});

  // Get region comments
  const comments = {};
  for (const { label } of info.regions) {
    const result = await axios.get(`/item/${ subvolumeId }/region_comments`, { 
      params: {
        region_label: label
      }
    });

    comments[label] = result.data;
  };

  // Copy info and rename to be more concise
  return {
    id: itemId,
    subvolumeId: subvolumeId,
    name: info.name,
    description: info.description,
    updated: convertDate(info.last_updated_time),
    location: {...info.location},
    regions: info.regions.map((region, i) => ({
      ...region,
      label: +region.label,
      color: info.color[region.label],
      comments: comments[region.label],
      index: i
    })),
    status: getStatus(info),
    imageId: imageInfo._id,
    maskId: maskInfo._id
  };
};

// API

export const api = {
  checkLogin: async () => {
    axios.defaults.headers.common['Girder-Token'] = getCookie('girderToken');

    const response = await axios.get('/user/me');

    if (response.data) {
      const user = await addUserInfo(response.data);
  
      return user;
    }
    else {
      return null;
    }
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

    if (response.data.user) {
      const user = await addUserInfo(response.data.user);
  
      return user;
    }
    else {
      return null;
    }
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

    if (response.data) {
      const user = await addUserInfo(response.data);
  
      return user;
    }
    else {
      return null;
    }
  },
  getVolumes: async () => {
    const response = await axios.get('/system/subvolume_ids');

    const volumes = [];

    for (const volume of response.data) {
      try {
        const infoResponse = await axios.get(`/item/${ volume.id }/subvolume_info`);

        const { data } = infoResponse;

        // Get parent volume info
        const pathResponse = await axios.get(`/item/${ volume.id }/rootpath`);

        // Copy info and rename to be more concise
        volumes.push({
          id: data.id,
          name: data.name,
          description: data.description,
          path: pathResponse.data,
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
  getAssignments: async (userId, reviewer) => {
    const assignments = [];

    // Get user's assignments
    const assignmentResponse = await axios.get(`/user/${ userId }/assignment`);

    for (const item of assignmentResponse.data) {
      const assignment = await getAssignment(item.subvolume_id, item.item_id);

      assignments.push(assignment); 
    }

    const reviewResponse = await axios.get(`/user/${ userId }/assignment_await_review`);

    for (const item of reviewResponse.data) {
      const assignment = await getAssignment(item.subvolume_id, item.item_id);

      // XXX: Leaving out until issue with assignment_await_review is fixed
      //assignments.push(assignment); 
    }

    // Get available review assignments
    if (reviewer) {
      const volumeResponse = await axios.get('/system/subvolume_ids');

      for (const { id } of volumeResponse.data) {
        const reviewResponse = await axios.get(`/item/${ id }/available_items_for_review`);

        for (const review of reviewResponse.data) {
          // Check we don't already have it
          if (!assignments.find(({ id }) => id === review.id)) {
            const assignment = await getAssignment(id, review.id);

            // XXX: Verify last user is correct
            assignment.user = review.annotation_completed_by[review.annotation_completed_by.length - 1].user;

            assignments.push(assignment); 
          }
        }
      }
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

    console.log(response);

    if (response.data.length === 0) throw new Error('No new assignment');

    const item = response.data[0];

    const assignment = await getAssignment(item.subvolume_id, item.item_id);

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
  updateAssignment: async (subvolumeId, itemId) => {
    const assignment = await getAssignment(subvolumeId, itemId);

    return assignment;
  },
  requestAssignment: async (userId, subvolumeId, itemId) => {
    const response = await axios.post(`/user/${ userId }/request_assignment`,
      null,
      {
        params: {
          subvolume_id: subvolumeId,
          assign_item_id: itemId
        }
      })
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
  saveAnnotations: async (userId, itemId, buffer, regions, done = false) => {
    const blob = new Blob([buffer], { type: 'image/tiff' });

    const regionObject = key => regions.reduce((object, region) => {
      return {
        ...object,
        [region.label]: region[key]
      }
    }, {});

    // Set form data
    const formData = new FormData();
    formData.append('current_region_ids', JSON.stringify(regions.map(({ label }) => label)));
    formData.append('comment', JSON.stringify(regionObject('comment')));
    formData.append('color', JSON.stringify(regionObject('color')));
    formData.append('content_data', blob);    

    await axios.post(`/user/${ userId }/annotation`, 
      formData,
      {
        params: { 
          item_id: itemId,
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