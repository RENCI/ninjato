import { RenderWindow, Slice, Image, Mask } from 'modules/view/components';
import { Widgets } from 'modules/flag/components/slice-view/widgets';

export function SliceView(onEdit, onSliceChange) {
  const renderWindow = RenderWindow();
  const slice = Slice();
  const image = Image();
  const mask = Mask(); 
  const widgets = Widgets(onEdit);

  return {
    initialize: (rootNode, onKeyDown, onKeyUp) => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      
      slice.initialize(renderWindow);

      const interactor = renderWindow.getInteractor();
      interactor.onKeyDown(evt => (
        evt.key === 'i' ? image.toggleInterpolation() : onKeyDown(evt)
      ));
      interactor.onKeyUp(onKeyUp);

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
    setLinkMode: (linkMode, cursor) => {
      widgets.setLinkMode(linkMode)
      renderWindow.getInteractor().getView().setCursor(cursor);
    },
    setSlice: slice => image.getMapper().setSlice(slice),
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