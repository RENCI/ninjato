import { useContext } from 'react';
import { Button, Modal, Tab, Menu } from 'semantic-ui-react';
import { 
  UserContext, 
  RefineContext, REFINE_SET_ACTIVE_REGION 
} from 'contexts';
import { CommentHistory } from 'modules/comment/components/comment-history';

const { Header, Content } = Modal;

export const CommentContainer = () => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ activeRegion }, refineDispatch] = useContext(RefineContext);

  const { regions } = assignment;

  const onTabChange = (evt, { activeIndex }) => {
    refineDispatch({ type: REFINE_SET_ACTIVE_REGION, region: regions[activeIndex] });
  };

  return (
    <Modal
      dimmer='blurring'
      trigger={ <Button basic icon='comments outline' /> }
    >
      <Header>Comments</Header>
      <Content>
        <Tab           
          activeIndex={ regions.indexOf(activeRegion) }
          menu={{ secondary: true, pointing: true }}
          panes={ regions.map(({ label, color, comments }) => (
            { 
              menuItem: <Menu.Item key={ label } style={{ color: color }}>{ label }</Menu.Item>,
              render: () => (
                <Tab.Pane>
                  <CommentHistory comments={ comments } />
                </Tab.Pane>
              )
            } 
          ))}
          onTabChange={ onTabChange }
        />
      </Content>
    </Modal>
  );
};