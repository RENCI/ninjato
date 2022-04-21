export const isActive = ({ status }) => status === 'active';

export const hasActive = assignments => 
  assignments && assignments.filter(assignment => isActive(assignment)).length > 0;