const statusValues = {
  active: 'active',
  review: 'under review',
  waiting: 'awaiting review',
  completed: 'completed'
};

Object.freeze(statusValues);
const statusValuesOrder = Object.keys(statusValues).reduce((order, status, i) => {
  order[status] = i;
  return order;
}, {});

export const statusDisplay = ({ status }) => statusValues[status];

export const statusOrder = ({ status }) => statusValuesOrder[status];

export const isActive = ({ status }) => status === 'active';

export const hasActive = assignments => 
  assignments && assignments.filter(assignment => isActive(assignment)).length > 0;