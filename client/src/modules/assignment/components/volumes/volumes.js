import { useContext } from 'react';
import { Header } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { Volume } from './volume';
import styles from './styles.module.css';

export const Volumes = () => {
  const [{ id, volumes }] = useContext(UserContext);

  return (     
    <>          
      { !volumes ? null
      : volumes.length === 0 ? 
        <Header as='h4'>No data available</Header>
      : 
        <>
          <Header as='h4'>Available volumes</Header>
          <div className={ styles.container }>
            { volumes.map((volume, i) => (
              <div key={ i }>
                <Volume volume={ volume } />
              </div>
            ))}
          </div>
        </>
      }
    </>
  );
};