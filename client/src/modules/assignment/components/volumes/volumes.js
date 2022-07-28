import { Header } from 'semantic-ui-react';
import { Volume } from './volume';
import styles from './styles.module.css';

const { Subheader } = Header;

export const Volumes = ({ header, subheader, volumes, enabled }) => {
  return (     
    !volumes ? null :    
    <>    
      <Header as='h5'>
        { header }
        { subheader && 
          <Subheader>
            { subheader }
          </Subheader>
        }            
      </Header>
      <div className={ styles.container }>
        { volumes.map((volume, i) => (
          <div key={ i }>
            <Volume 
              volume={ volume }
              enabled={ enabled }
            />
          </div>
        ))}
      </div>
    </>
  );
};