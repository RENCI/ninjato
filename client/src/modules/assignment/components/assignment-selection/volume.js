import { useContext, Fragment } from 'react';
import { Segment, List, Button } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { useLoadData } from 'hooks';

export const Volume = ({ volume }) => {
  const [{ stages, assignment }] = useContext(UserContext);
  const loadData = useLoadData();

  const onLoadClick = () => {
    loadData(assignment);
  };

  const assignments = volume.assignments.filter(({ type }) => type === volume.stage);
  const completed = assignments.filter(({ status }) => status === 'completed');
  const active = assignments.filter(({ status }) => status === 'active');
  const available = assignments.filter(({ status }) => status === 'available');
  const enabled = available.length > 0;

  return (
    <Segment 
      color={ enabled ? 'blue' : null } 
      secondary={ !enabled }
    >
      <List divided relaxed>
        <List.Item>
          Volume name: 
          <div style={{ fontWeight: 'bold', textAlign: 'center' }}>{ volume.name }</div>
        </List.Item>
        <List.Item>
          Progress:
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            { stages.map((stage, i, a) => {
              const active = stage === volume.stage;
              return (
                <Fragment key={ i }>
                  <div 
                    style={{ 
                      flex: '1 0 auto',
                      textAlign: 'center',
                      fontWeight: active ? 'bold' : null ,
                      color: active ? '#000' : '#999'
                    }}              
                  > 
                    { stage }
                  </div>
                  { i < a.length - 1 && 
                    <span style={{ color: '#999' }}>/</span>
                  }
                </Fragment>
              );            
            })}
          </div>
        </List.Item>
        <List.Item>
          Assignments:
          <div style={{ marginTop: 5, marginBottom: 5}}><span style={{ fontWeight: 'bold'}}>{ completed.length }</span> completed:</div>
          <div style={{ marginBottom: 5}}><span style={{ fontWeight: 'bold'}}>{ active.length }</span> active</div>
          <div style={{ marginBottom: 5}}><span style={{ fontWeight: 'bold'}}>{ available.length }</span> available</div>
          <Button 
            primary 
            disabled={ !enabled }
            onClick={ onLoadClick }
          >
            Load Assignment
          </Button>
        </List.Item>
      </List>
    </Segment>
  );  
};