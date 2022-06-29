import { useState } from 'react';
import { Image, Segment, Divider, Menu, Dimmer, Loader } from 'semantic-ui-react';
import { NavigateButtons } from 'modules/common/components/navigate-buttons';
import styles from './home.module.css';

const imageSrc = 'https://images.squarespace-cdn.com/content/v1/55d80033e4b02dba43ff8058/1563373073348-ZQUETA5SCNUQLCPSB6O6/OlehKrupaWTmousecortex.jpg';

export const Home = () => {
  const [loaded, setLoaded] = useState(false);

  const onImageLoad = () => {
    setLoaded(true);
  };

  return (
    loaded ?
      <>
        <div className={ styles.container }>
          <Segment inverted basic>
            <div className={ styles.wrapper }>
              <Image
                src={ imageSrc }
                onLoad={ onImageLoad } 
              />
              <div>
                <div className={ styles.text }>
                  With ~100 million nuclei, no human can count all the cells in a mouse brain
                </div>
                <div className={ styles.text }>
                  We need to train an image recognition algorithm to recognize what a nucleus looks like
                </div>
                <div className={ styles.text }>
                  This requires many manually labeled nuclear samples, so we've developed ninjatō to make this easier to do
                </div>
                <div className={ styles.text }>
                  This tool will enable us to quantify differences in brain structure caused by mutations associated with neuropsychiatric disorders
                </div>
                <div className={ styles.text }>
                  You can help
                </div>
              </div>
              <div className={ styles.credit }>Image credit: Oleh Krupa</div>
            </div>
          </Segment>
          <Divider hidden>To continue...</Divider>        
          <Segment basic>
            <NavigateButtons />
          </Segment>
        </div>
        <Menu secondary fixed='bottom'>
          <Menu.Menu position='right'>
            <Menu.Item name='Project Website' icon='info circle' link href='https://www.nucleininja.org/' />
            <Menu.Item name='Github repo' icon='github' link href='https://github.com/RENCI/ninjato' />
          </Menu.Menu>
        </Menu>
      </>
    :
    <>
      <Image        
        src={ imageSrc }
        onLoad={ onImageLoad } 
      />
      <Dimmer active>
        <Loader content='Loading' />
      </Dimmer>
    </>
  );
};