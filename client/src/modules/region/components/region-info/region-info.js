import { List, Divider } from 'semantic-ui-react';
import { RegionIcon } from 'modules/region/components/region-icon';

const { Item, Content, Header, Description, Icon } = List;

const statusIcon = status =>
  status === 'inactive' ? 'lock open' : 'lock';

const statusDetail = status => 
  status === 'inactive' ? 'available to claim' : null;

const infoItem = (header, description, detail = null, icon = null) => (
  <Item>
    <Content>
      <Header>{ header }</Header>
      <Description>
        { icon && <Icon name={ icon } /> }
        { description }
        { detail && <div style={{ fontSize: 'x-small', color: '#999' }}>{ detail }</div> }
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
            { region.info.status && infoItem('Status', region.info.status, statusDetail(region.info.status), statusIcon(region.info.status)) }
            { region.info.annotator?.login && infoItem('User', region.info.annotator.login) }
            { region.info.reviewer?.login && infoItem('Reviewer', region.info.reviewer.login) } 
          </List>
        </>
      }
    </>
  );
};
