import { useContext } from 'react';
import { Message } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RegionSelect } from 'modules/common/components/region-select';
import { CommentContainer } from 'modules/comment/components/comment-container';
import styles from './styles.module.css';

export const AssignmentMessage = () => {
  const [{ assignment }] = useContext(UserContext);

  return (
    assignment && 
    <Message attached className={ styles.message }>
      <div>Refining { assignment.regions.length } regions:</div>
      <RegionSelect />
      <CommentContainer />
    </Message>
  );
};