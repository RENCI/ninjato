import { useContext } from 'react';
import { Header, Label } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { Volume } from './volume';
import { hasActive } from 'utils/assignment-utils';
import styles from './styles.module.css';

const { Subheader } = Header;

export const Volumes = () => {
  const [{ assignments, volumes }] = useContext(UserContext);

  const hasActiveAssignment = hasActive(assignments);

  return (     
    <>          
      { !volumes ? null
      : volumes.length === 0 ? 
        <Header as='h4'>No volumes available</Header>
      : 
        <>
          <Header as='h4'>
            Volumes
            <Subheader>
              { hasActiveAssignment ?
                <>Complete all active assignments before requesting a new assignment</>
              :
                <>Select an available volume to begin a new assignment</>
              }
            </Subheader>            
          </Header>
          <div className={ styles.container }>
            { volumes.map((volume, i) => (
              <div key={ i }>
                <Volume 
                  volume={ volume }
                  enabled={ !hasActiveAssignment }
                 />
              </div>
            ))}
          </div>
        </>
      }
    </>
  );
};