import { List, Divider } from 'semantic-ui-react';
import { RegionIcon } from 'modules/region/components/region-icon';

const { Item, Content, Header, Description, Icon } = List;

const statusIcon = status =>
  status === 'inactive' ? 'lock open' : 'lock';

const infoItem = (header, description, icon = null) => (
  <Item>
    <Content>
      <Header>{ header }</Header>
      <Description>
        { icon && <Icon name={ icon } /> }
        { description }
      </Description>
    </Content>
  </Item>
);

export const RegionInfo = ({ region }) => {
  return !region ? null : (
    <>
      <RegionIcon region={ region } />      
      { region.info &&
        <>
          <Divider fitted />
          <List horizontal>
            { region.info.status && infoItem('Status', region.info.status, statusIcon(region.info.status)) }
            { region.info.annotator && infoItem('User', region.info.annotator.login) }
            { region.info.reviewer && infoItem('Reviewer', region.info.reviewer.login) } 
          </List>
        </>
      }
    </>
  );
};
