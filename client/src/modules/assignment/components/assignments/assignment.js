import { useContext } from 'react';
import { Segment, Header, Label } from 'semantic-ui-react';
import { UserContext, SET_ASSIGNMENT } from 'contexts';
import { ButtonWrapper } from 'modules/common/components/button-wrapper';
import { useLoadData } from 'hooks';
import { isActive } from 'utils/assignment-utils';
import styles from './styles.module.css';

export const Assignment = ({ assignment }) => {
  const [, userDispatch] = useContext(UserContext);
  const loadData = useLoadData();

  console.log(assignment);

  const { name, description, updated, regions, review_assigned_to } = assignment;
  const enabled = isActive(assignment);

  const onLoadClick = () => {
    userDispatch({ 
      type: SET_ASSIGNMENT, 
      assignment: assignment, 
      assignmentType: 'refine' 
    });

    loadData(assignment);
  };

  return (
    <ButtonWrapper 
      onClick={ onLoadClick}
      disabled={ !enabled }
    >
      <Segment
        color={ enabled ? 'green' : 'grey' } 
        raised={ enabled }
        circular
        className={ styles.assignment }
      >  
        <div>
          <div> 
            <Header 
              as='h5'
              content={ name ? name : 'No name'}
              subheader={ description ? description : 'No description' }
            />
          </div>
          <div>
            <Label basic circular content='Status' detail={ enabled ? 'active' : 'pending review' } />
          </div>
          <div>
            <Label basic circular content='Updated' detail={ updated.toLocaleString() } />
          </div>
          <div>
            <Label basic circular content='Labels' detail={ regions.map(({ label }) => label).join(', ') } />
          </div>
        </div>
      </Segment>
    </ButtonWrapper>
  );
};