export const isActive = ({ review_assigned_to }) => review_assigned_to === ''; 

export const hasActive = assignments => 
  assignments && assignments.filter(assignment => isActive(assignment)).length > 0;