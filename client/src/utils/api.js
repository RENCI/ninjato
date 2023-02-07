import axios from 'axios';
import { decodeTIFF } from 'utils/data-conversion';
import { computeDiceScore, getUniqueLabels } from './data';

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
  info.status === 'inactive' ? 'inactive' :
  'active'
);

const regionObject = (regions, key) => regions.reduce((object, region) => {
  return region[key] ? {
    ...object,
    [region.label]: region[key]
  } : object;
}, {});

const addUserInfo = async user => {
  user.reviewer = false;
  user.trainee = false;
  for (const group of user.groups) {
    const response = await axios.get(`/group/${ group }`);

    if (response.data.name === 'reviewers') {
      user.reviewer = true;
    }
    else if (response.data.name === 'trainees') {
      user.trainee = true;
    }
  }

  if (user.reviewer && user.trainee) {
    throw new Error(`User ${ user.login } is both a reviewer and a trainee`);
  }

  return user;
};

const getComments = async (subvolumeId, regions) => {
  const comments = {};
  for (const { label } of regions) {
    const result = await axios.get(`/item/${ subvolumeId }/region_comments`, { 
      params: {
        region_label: label
      }
    });

    comments[label] = result.data;
  };

  return comments;
};

const getAssignment = async (subvolumeId, itemId) => {
  // Get assignment info
  const infoResponse = await axios.get(`/item/${ subvolumeId }/subvolume_assignment_info`, {
    params: { assign_item_id: itemId }
  }); 

  const info = infoResponse.data;

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
      index: i,
      visible: true
    })),
    status: getStatus(info),
    annotator: info.annotator ? info.annotator : null,
    reviewer: info.reviewer ? info.reviewer : null
  };
};

const getTrainingInfo = async volume => {
  const goldId = volume.gold_standard_mask_item_id;

  if (!goldId) return null;
  
  const goldFiles =  await axios.get(`/item/${ goldId }/files`);
  const goldFile = goldFiles.data[0];

  const volumeFiles = await axios.get(`/item/${ volume.id }/files`);
  const maskFile = volumeFiles.data.find(({ name }) => name.includes('_masks.tif'));

  // Get files
  const fileResponses = await Promise.all([
    axios.get(fileUrl(goldFile._id), { responseType: 'arraybuffer' }), 
    axios.get(fileUrl(maskFile._id), { responseType: 'arraybuffer' })      
  ]);

  const goldData = decodeTIFF(fileResponses[0].data);
  const maskData = decodeTIFF(fileResponses[1].data);

  return {
    diceScore: computeDiceScore(goldData, maskData),
    regionDifference: getUniqueLabels(maskData).length - getUniqueLabels(goldData).length
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
  getVolumes: async (login, reviewer, trainee) => {
    // Get volumes based on user type
    let responses = [];
    if (reviewer) {
      const response = await axios.get('/system/subvolume_ids');
      const trainingResponse = await axios.get('/system/subvolume_ids', {
        params: {
          training: true
        }
      });

      responses = [...response.data, ...trainingResponse.data];
    }
    else {     
      const response = await axios.get('/system/subvolume_ids', {
        params: {
          training: trainee
        }
      });

      responses = response.data;
    }

    const volumes = [];

    for (const volume of responses) {
      try {
        const infoResponse = await axios.get(`/item/${ volume.id }/subvolume_info`);

        console.log(infoResponse);

        const { data } = infoResponse;

        if (trainee && data.training_user !== login) continue;

        // Get parent volume info
        const pathResponse = await axios.get(`/item/${ volume.id }/rootpath`);

        // Get info for training volumes
        const trainingInfo = data.training_user ? await getTrainingInfo(data) : null;

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
          history: data.history,
          trainingUser: data.training_user ? data.training_user : null,
          trainingInfo: trainingInfo
        });      
      }      
      catch (error) {
        console.log(error);
      }
    }

    return volumes;
  },
  getAssignments: async (userId, reviewer, trainee, getAll = false) => {
    const assignments = [];

    // Get user's assignments based on user type
    let responses = [];
    if (reviewer) {  
      const response = await axios.get(`/user/${ userId }/assignment`);
      const trainingResponse = await axios.get(`/user/${ userId }/assignment`, {
        params: {
          training: true
        }
      });
      trainingResponse.data.forEach(assignment => assignment.training = true);

      responses = [...response.data, ...trainingResponse.data];
    }
    else {
      const response = await axios.get(`/user/${ userId }/assignment`, {
        params: {
          training: trainee
        }
      });

      responses = response.data;
    }

    // Filter out duplicates and by status
    const filtered = Object.values(responses.reduce((assignments, assignment) => {
      assignments[assignment.item_id] = assignment;
      return assignments;
    }, {})).filter(({ status }) => 
      getAll ? true : 
      reviewer ? status === 'active' || status === 'under review' :
      status === 'awaiting review' || status === 'active' || status === 'under review'
    );

    // Get assignment details
    for (const item of filtered) {
      const assignment = await getAssignment(item.subvolume_id, item.item_id);

      assignments.push(assignment); 
    }

    // If reviewer, Get available review assignments
    let availableReviews = [];
    if (reviewer) {
      const volumeResponse = await axios.get('/system/subvolume_ids');
      const trainingResponse = await axios.get('/system/subvolume_ids', {
        params: {
          training: true
        }
      });

      for (const { id } of [...volumeResponse.data, ...trainingResponse.data]) {
        const n = availableReviews.push({
          volumeId: id,
          assignments: []
        });
 
        const reviewResponse = await axios.get(`/item/${ id }/available_items_for_review`);

        for (const review of reviewResponse.data) {
          const index = assignments.findIndex(({ id }) => id === review.id);

          if (index !== -1) {
            console.warn(`Assignment ${ review.id } in reviewer assignments and available for review`);
            assignments.splice(index, 1);
          }
          
          availableReviews[n - 1].assignments.push({
            id: review.id,
            needToLoad: true
          });          
        }
      }
    }

    return {
      assignments: assignments,
      availableReviews: availableReviews
    };
  },
  getAssignment: async (subvolumeId, itemId, training) => {
    return await getAssignment(subvolumeId, itemId, training);
  },
  getNewAssignment: async (userId, subvolumeId, training) => {
    const response = await axios.get(`/user/${ userId }/assignment`,
      {
        params: {
          subvolume_id: subvolumeId,
          request_new: true
        }
      }
    );

    if (response.data.length === 0) return null;

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
  updateComments: async (subvolumeId, regions) => {
    const comments = await getComments(subvolumeId, regions);

    return comments;
  },
  requestAssignment: async (userId, subvolumeId, itemId, review = false) => {
    await axios.post(`/user/${ userId }/request_assignment`,
      null,
      {
        params: {
          subvolume_id: subvolumeId,
          assign_item_id: itemId,
          request_review_assignment: review
        }
      }
    );
  },
  requestAssignmentByLabel: async (userId, subvolumeId, label) => {
    // Get assignment info
    const response = await axios.post(`/user/${ userId }/request_assignment`,
      null,
      {
        params: {
          subvolume_id: subvolumeId,
          request_region_id: label
        } 
      }
    );

    if (response.data.status !== 'success') throw new Error(`Could not get assignment with label ${ label }`);

    const assignment = await getAssignment(subvolumeId, response.data.assigned_item_id);

    return assignment;
  },
  getData: async assignment => {
    const getFiles = async ({ id }) => {
      const response = await axios.get(`/item/${ id }/files`);

      // Get file info
      const { imageInfo, maskInfo } = response.data.reduce((info, item) => {
        // XXX: Depending on file naming conventions here. 
        if (item.name.includes('_masks_regions_user.tif')) {
          info.maskInfo = item;
        }
        else if (item.name.includes('_masks_regions.tif')) {
          if (!info.maskInfo) {
            info.maskInfo = item;
          }
        }
        else if (item.name.includes('_regions.tif')) {
          info.imageInfo = item;
        }

        return info;
      }, {});

      // Get files
      const fileResponses = await Promise.all([
        axios.get(fileUrl(imageInfo._id), { responseType: 'arraybuffer' }), 
        axios.get(fileUrl(maskInfo._id), { responseType: 'arraybuffer' })      
      ]);

      return {
        imageBuffer: fileResponses[0].data,
        maskBuffer: fileResponses[1].data
      }; 
    };

    // Adding directly to assignment without dispatching because 
    // assignment isn't loaded yet
    const addComments = async ({ subvolumeId, regions }) => {
      const comments = await getComments(subvolumeId, regions);

      regions.forEach(region => region.comments = comments[region.label])
    };

    // Get file names and region comments
    const responses = await Promise.all([
      getFiles(assignment),
      addComments(assignment)
    ]);

    return responses[0];     
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
  getRegionInfo: async (subvolumeId, regionId) => {
    try {
      const infoResponse = await axios.get(`/item/${ subvolumeId }/subvolume_assignment_info`, {
        params: { region_id: regionId }    
      });

      return infoResponse.data;
    }
    catch (error) {
      console.warn(`Error getting subvolume assignment info for region ${ regionId } in subvolume ${ subvolumeId }`);

      return { status: 'unknown' };
    }
  },
  saveAnnotations: async (userId, itemId, buffer, regions, done = false) => {
    const blob = new Blob([buffer], { type: 'application/octet' });

    // Set form data
    const formData = new FormData();
    formData.append('current_region_ids', JSON.stringify(regions.map(({ label }) => label)));
    formData.append('comment', JSON.stringify(regionObject(regions, 'comment')));
    formData.append('color', JSON.stringify(regionObject(regions, 'color')));
    formData.append('content_data', blob);    

    const response = await axios.post(`/user/${ userId }/annotation`, 
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

    return response.data;
  },
  claimRegion: async (userId, subvolumeId, assignmentId, label, buffer, regions) => {
    const blob = new Blob([buffer], { type: 'application/octet' });

    // Set form data
    const formData = new FormData();
    formData.append('current_region_ids', JSON.stringify(regions.map(({ label }) => label)));
    formData.append('content_data', blob);    

    const response = await axios.post(`/user/${ userId }/claim_assignment`, 
      formData, {
      params: {
        subvolume_id: subvolumeId,
        active_assignment_id: assignmentId,
        claim_region_id: label
      }
    });

    if (response.data.status !== 'success') throw new Error(`Error adding region ${ label }`);

    return response.data;
  },
  removeRegion: async (userId, subvolumeId, assignmentId, label, buffer, regions) => {
    const blob = new Blob([buffer], { type: 'application/octet' });

    // Set form data
    const formData = new FormData();
    formData.append('current_region_ids', JSON.stringify(regions.map(({ label }) => label)));
    formData.append('content_data', blob);   

    const response = await axios.post(`/user/${ userId }/remove_region_from_assignment`, 
      formData, {
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
  },
  saveReview: async (userId, itemId, buffer, regions, done = false, approve = false) => {
    const blob = new Blob([buffer], { type: 'application/octet' });

    // Set form data
    const formData = new FormData();
    formData.append('current_region_ids', JSON.stringify(regions.map(({ label }) => label)));
    formData.append('comment', JSON.stringify(regionObject(regions, 'comment')));
    formData.append('content_data', blob);    

    await axios.post(`/user/${ userId }/review_result`, 
      formData,
      {
        params: { 
          item_id: itemId,
          done: done,
          approve: approve
        },
        headers: { 
          'Content-Type': 'multipart/form-data' 
        }
      }
    );
  },
  declineReview: async (userId, itemId) => {
    const response = await axios.post(`/user/${ userId }/review_result`,
      null,
      {
        params: {
          item_id: itemId,
          reject: true,
          approve: false
        }
      }
    );

    return response.data;
  }
};