const statusValues = {
  active: 'active',
  review: 'under review',
  waiting: 'awaiting review',
  completed: 'completed',
  inactive: 'inactive'
};

Object.freeze(statusValues);

const statusColors = {
  active: 'green',
  review: 'teal',
  waiting: 'yellow',
  completed: 'grey'
};

Object.freeze(statusColors);

const statusValuesOrder = Object.keys(statusValues).reduce((order, status, i) => {
  order[status] = i;
  return order;
}, {});

Object.freeze(statusValuesOrder);

export const statusDisplay = (status) => statusValues[status];

export const statusOrder = (status) => statusValuesOrder[status];

export const statusColor = (status) => statusColors[status];

export const isActive = ({ status }) => status === 'active';

export const hasActive = assignments => 
  assignments && assignments.filter(assignment => isActive(assignment)).length > 0;