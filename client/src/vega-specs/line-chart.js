export const lineChart = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  width: "container",
  height: 400,
  autosize: {
    type: "fit",
    resize: true
  },
  data: {
    name: "data"
  },
  mark: 'line',
  encoding: {
    x: { field: 'time', 'type': 'temporal' },
    y: { field: 'count', 'type': 'quantitative' },
    color: { field: 'status', type: 'nominal' }
  }
};