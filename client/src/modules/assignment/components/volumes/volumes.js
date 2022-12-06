import { Header } from 'semantic-ui-react';
import { Volume } from './volume';
import styles from './styles.module.css';

const { Subheader } = Header;

export const Volumes = ({ header, subheader, volumes, availableReviews, enabled }) => {
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
              availableReviews={ availableReviews ? availableReviews.find(({ volumeId }) => volumeId === volume.id) : null }
              enabled={ enabled }
            />
          </div>
        ))}
      </div>
    </>
  );
};