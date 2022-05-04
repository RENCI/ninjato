import { useContext } from 'react';
import { Segment, Header, Label } from 'semantic-ui-react';
import { UserContext, SET_ASSIGNMENT } from 'contexts';
import { ButtonWrapper } from 'modules/common/components/button-wrapper';
import { useLoadData } from 'hooks';
import { isActive, statusDisplay } from 'utils/assignment-utils';
import styles from './styles.module.css';

export const Assignment = ({ assignment }) => {
  const [, userDispatch] = useContext(UserContext);
  const loadData = useLoadData();

  const { name, description, status, updated, regions } = assignment;
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
            <Label 
              basic 
              circular 
              content='Status' 
              color={ status === 'active' ? 'green' : null }
              detail={ statusDisplay(assignment) } 
            />
          </div>
          <div>
            <Label 
              basic 
              circular 
              content='Updated' 
              detail={ updated.toLocaleString() } 
            />
          </div>
          <div>
            <Label 
              basic 
              circular 
              content={ regions.length > 1 ? 'Labels' : 'Label' } 
              detail={ regions.map(({ label }) => label).sort((a, b) => a - b).join(', ') } 
            />
          </div>
        </div>
      </Segment>
    </ButtonWrapper>
  );
};