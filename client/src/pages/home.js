import { Image, Segment, Grid, Button, Divider, Menu } from 'semantic-ui-react';
import styles from './home.module.css';

export const Home = () => {
  return (
    <>
    <div className={ styles.container }>
      <div className={ styles.wrapper }>
        <div className={ styles.wrapper }>
          <Image src='https://images.squarespace-cdn.com/content/v1/55d80033e4b02dba43ff8058/1563373073348-ZQUETA5SCNUQLCPSB6O6/OlehKrupaWTmousecortex.jpg' />
          <div className={ styles.text + " " + styles.text1 }>
            With ~100 million nuclei, no human can count all the cells in a mouse brain
          </div>
          <div className={ styles.text + " " + styles.text2 }>
            We need to train an image recognition algorithm to recognize what a nucleus looks like
          </div>
          <div className={ styles.text + " " + styles.text3 }>
            This requires many manually labeled nuclear samples, so we've developed ninjatō to make this easier to do
          </div>
          <div className={ styles.text + " " + styles.text4 }>
            This tool will enable us to quantify differences in brain structure caused by mutations associated with neuropsychiatric disorders
          </div>
        </div>      
        <Divider hidden>To continue...</Divider>
        <Segment basic>
          <Grid columns={2} stackable relaxed='very'>
            <Grid.Column>
              <Button content='Log in' icon='user' size='big' basic fluid />
            </Grid.Column>

            <Grid.Column verticalAlign='middle'>
              <Button content='Register' icon='signup' size='big' basic fluid />
            </Grid.Column>
          </Grid>
          <Divider vertical hidden>Or</Divider>
        </Segment>
        </div>
    </div>
    <Menu secondary fixed='bottom'>
      <Menu.Item name='Project Website' link href='https://www.nucleininja.org/' />
      <Menu.Item name='Github repo' icon='github' link href='https://github.com/RENCI/ninjato' />
    </Menu>
    </>
  );
};