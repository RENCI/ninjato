import vtkStateBuilder from '@kitware/vtk.js/Widgets/Core/StateBuilder';

export default function generateState(radius) {
  return vtkStateBuilder
    .createBuilder()
    .addField({
      name: 'brush',
      initialValue: [[1, 1, 1, 1]],
    })
    .addStateFromMixin({
      labels: ['handle'],
      mixins: [
        'origin',
        'color',
        'scale1',
        'orientation',
        'manipulator',
        'visible'
      ],
      name: 'handle',
      initialValues: {
        scale1: radius * 2,
        orientation: [1, 0, 0, 0, 1, 0, 0, 0, 1]
      },      
    })
    .build();
}
