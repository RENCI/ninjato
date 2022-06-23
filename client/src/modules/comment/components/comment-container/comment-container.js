import { useContext } from 'react';
import { Button, Modal, Tab, Menu, Header } from 'semantic-ui-react';
import { 
  UserContext, 
  RefineContext, REFINE_SET_ACTIVE_REGION 
} from 'contexts';
import { CommentHistory } from 'modules/comment/components/comment-history';
import { RegionIcon } from 'modules/common/components/region-icon';

const {  Content } = Modal;

export const CommentContainer = () => {
  const [{ assignment }] = useContext(UserContext);
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
      <Header sub>Select region</Header>
        <Tab           
          activeIndex={ regions.findIndex(({ label }) => label === activeRegion?.label) }
          menu={{ secondary: true, pointing: true }}
          panes={ regions.map(region => (
            { 
              menuItem: (
                <Menu.Item key={ region.label }>
                  <RegionIcon region={ region } />              
                </Menu.Item>
              ),
              render: () => (
                <Tab.Pane>
                  <CommentHistory region={ region } />
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