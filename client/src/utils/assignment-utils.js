export const isActive = ({ status }) => status.completedBy === ''; 

export const hasActive = assignments => 
  assignments && assignments.filter(assignment => isActive(assignment)).length > 0;