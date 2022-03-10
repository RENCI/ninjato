import { RenderWindow, Slice, Image } from 'modules/view/components';
import { Mask } from 'modules/view/components/mask';
import { Widgets } from 'modules/flag/components/slice-view/widgets';
import { getCursor } from 'utils/cursor';

const cursors = {
  link: getCursor('chain.png', 12, 23),
  unlink: getCursor('broken-chain.png', 11, 23),
  invalid: 'default'
};

export function SliceView(onAddLink, onRemoveLink, onHighlight, onSliceChange) {
  const renderWindow = RenderWindow();
  const slice = Slice();
  const image = Image();
  const mask = Mask();  

  let links = [];

  const isValid = label => label !== null && label !== 0 && label !== mask.getLabel();

  const onSelect = label => {
    if (!isValid(label)) return;

    if (links.includes(label)) {
      renderWindow.setCursor(cursors.link);
      renderWindow.updateView();
      onRemoveLink(label);
      onHighlight(null);
    }
    else {
      renderWindow.setCursor(cursors.unlink);
      renderWindow.updateView();
      onAddLink(label);
      onHighlight(null);
    }
  };

  const onHover = label => {
    if (!isValid(label)) {
      renderWindow.setCursor(cursors.invalid);
      onHighlight(null);
    }
    else if (links.includes(label)) {
      renderWindow.setCursor(cursors.unlink);
      onHighlight(label);
    }
    else {
      renderWindow.setCursor(cursors.link);
      onHighlight(label);
    }
  };

  const widgets = Widgets(onSelect, onHover);

  const render = renderWindow.render;

  return {
    initialize: (rootNode) => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      
      slice.initialize(renderWindow);

      widgets.setRenderer(renderWindow.getRenderer());
    },
    setData: (imageData, maskData) => {
      image.setInputData(imageData);    
      mask.setInputData(maskData);

      const renderer = renderWindow.getRenderer();
      renderer.addViewProp(image.getActor());
      renderer.addViewProp(mask.getActor());

      widgets.setImageData(maskData);

      const onUpdateSlice = (z, position) => {
        // Update mask slice
        mask.setSlice(z);

        // Update widget position
        widgets.update(position, imageData.getSpacing());

        // Callback
        onSliceChange(z);
      }

      slice.setImage(image.getActor(), renderWindow.getCamera(), onUpdateSlice);
      slice.setSliceByLabel(image.getMapper(), maskData, mask.getLabel());
    },
    setLabel: label => mask.setLabel(label),
    setSlice: slice => image.getMapper().setSlice(slice),
    setFlag: flag => widgets.setActive(flag),
    setLinks: linkLabels => {
      links = linkLabels;
      mask.setActiveLabels(linkLabels);
    },
    setHighlightLabel: label => mask.setHighlightLabel(label),
    render: () => {
      render();
    },
    cleanUp: () => {
      console.log('Clean up slice view');

      // Clean up anything we instantiated
      renderWindow.cleanUp();
      slice.cleanUp();
      image.cleanUp();
      mask.cleanUp();
      widgets.cleanUp();
    }
  };
}