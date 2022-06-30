import { useContext, useState, useEffect } from 'react';
import { Tab, Menu, Button } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { Assignments } from 'modules/assignment/components/assignments';
import { Volumes } from 'modules/assignment/components/volumes';
import { useGetAssignments } from 'hooks';
import styles from './styles.module.css';

const getParent = volume => volume.path[volume.path.length - 2].object;

export const AssignmentSelection = () => {
  const [{ user, assignments, assignment, volumes }] = useContext(UserContext);
  const [tabIndex, setTabIndex] = useState(0);
  const getAssignments = useGetAssignments();

  useEffect(() => {  
    if (user) getAssignments(user._id, user.reviewer);    
  }, [user, getAssignments]);

  const onRefreshClick = () => {
    if (user) getAssignments(user._id, user.reviewer);
  };

  useEffect(() => {
    console.log(assignment);
  }, []);

  const onTabChange = (evt, { activeIndex }) => {
    setTabIndex(activeIndex);
  };

  console.log(volumes);

  const reviewPane = {
    menuItem: <Menu.Item key={ 'review' }>Review</Menu.Item>,
    render: () => (
      <Tab.Pane>
        <div>
          Review
        </div>
      </Tab.Pane>
    )
  };

  const refinePane = {
    menuItem: <Menu.Item key={ 'refine' }>Refine</Menu.Item>,
    render: () => (
      <Tab.Pane>
        <Assignments />
        <Volumes />
      </Tab.Pane>
    )
  };

  const panes = user.reviewer ? [reviewPane, refinePane] : [refinePane];
/*
  return (
    
    (volumes && assignments) &&
    <>
      <Tab           
        activeIndex={ tabIndex }
        menu={{ secondary: true, pointing: true }}
        panes={ volumes.map(volume => (
          { 
            menuItem: (
              <Menu.Item key={ volume.id }>
                <div>{ getParent(volume).name }</div>
                <>:&nbsp;</>
                <div>{ volume.name }</div>
              </Menu.Item>
            ),
            render: () => (
              <Tab.Pane>
                volume
              </Tab.Pane>
            )
          } 
        ))}
        onTabChange={ onTabChange }
      />
      <Button 
        basic 
        circular 
        icon='sync' 
        className={ styles.refresh } 
        onClick={ onRefreshClick } 
      />
    </>
  );
*/
  return (
    <div>
      { (assignments && volumes) && (user.reviewer ?
        <Tab
          menu={{ secondary: true, pointing: true, attached: 'top', fluid: true, widths: panes.length }}
          panes={ panes }
        />  
      :
        <div>
          <Assignments />
          <Volumes />
        </div>
      )}
      <Button 
        basic 
        circular 
        icon='sync' 
        className={ styles.refresh } 
        onClick={ onRefreshClick } 
      />
    </div>
  )
};