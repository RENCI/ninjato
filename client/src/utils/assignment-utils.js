export const hasActive = assignments => 
  assignments && assignments.filter(assignment => !assignment.pending);