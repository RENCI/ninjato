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

  const setCursor = cursor => renderWindow.getInteractor().getView().setCursor(cursor);

  const isValid = label => label !== null && label !== 0 && label !== mask.getLabel();

  const onSelect = label => {
    if (!isValid(label)) return;

    if (links.includes(label)) {
      onRemoveLink(label);
    }
    else {
      onAddLink(label);
    }
  };

  const onHover = label => {
    if (!isValid(label)) {
      setCursor(cursors.invalid);
      onHighlight(null);
    }
    else if (links.includes(label)) {
      setCursor(cursors.unlink);
      onHighlight(label);
    }
    else {
      setCursor(cursors.link);
      onHighlight(label);
    }
  };

  const widgets = Widgets(onSelect, onHover);

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
    setLinks: linkLabels => {
      links = linkLabels;
    },
    setHighlightLabel: label => {
      mask.setHighlightLabel(label);
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