import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tab, Menu, Loader } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { VolumeProgress } from 'modules/progress/components/volume-progress';
import { api } from 'utils/api';

export const Progress = () => {
  const [{ user }] = useContext(UserContext);
  const [users, setUsers] = useState();
  const [volumes, setVolumes] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const getData = async () => {
      const users = await api.getUsers();
      setUsers(users);

      const volumes = await api.getVolumes();
      setVolumes(volumes);
    }
    
    getData();
  }, []);

  return (
    !user ?
      <RedirectMessage message='No User' />
    : !volumes ? 
      <Loader active />
    :
      <Tab
        menu={{ secondary: true, pointing: true, attached: true }}
        panes={ volumes.map(volume => ({    
          menuItem: <Menu.Item key={ volume.id }>{ volume.name }</Menu.Item>,
          render: () =>
            <VolumeProgress 
              volume={ volume } 
              users={ users } 
              reviewer={ user.reviewer } 
            />
        }))}
      />   
  );
/*
  // Include separate user tab here
  return (
    !user ?
      <RedirectMessage message='No User' />
    : !volumes ? 
      <Loader active />
    :
      <Tab
        menu={{ secondary: true, pointing: true, attached: true }}
        panes={[
          {
            menuItem: <Menu.Item key='volumes'>Volumes</Menu.Item>,
            render: () => 
              <Tab
                menu={{ secondary: true, pointing: true, attached: true }}
                panes={ volumes.map(volume => ({    
                  menuItem: <Menu.Item key={ volume.id }>{ volume.name }</Menu.Item>,
                  render: () =>
                    <VolumeProgress volume={ volume } users={ users } />
                }))}
              />
          },
          {
            menuItem: <Menu.Item key='users'>Users</Menu.Item>,
            render: () => 'users'
          }
        ]}
      />     
  );
*/  
};