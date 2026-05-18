// Window dimensions
const width = window.innerWidth;
const height = window.innerHeight;

// Margins
const margins = {
  top: 40,
  bottom: 40,
  left: 30,
  right: 30,
};

// Title Height
const headerHeight = 40;
const keyHeight = 40;

// Dimensions for all three charts
const chartDims = {
  bar: {
    width: width / 2,
    height: height / 2 - headerHeight / 2,
    innerWidth: chartDims.bar.width - margins.left - margins.right,
    innerHeight: chartDims.bar.height - margins.top - margins.bottom,
  },
  scatter: {
    width: width / 2,
    height: height / 2 - headerHeight / 2,
    innerWidth: chartDims.scatter.width - margins.left - margins.right,
    innerHeight: chartDims.scatter.height - margins.top - margins.bottom,
  },
  parallel: {
    width: width / 2,
    height: height - headerHeight,
    innerWidth: chartDims.parallel.width - margins.left - margins.right,
    innerHeight:
      chartDims.parallel.height - margins.top - margins.bottom - keyHeight,
  },
};

// Load the dataset
d3.csv("data/pokemon_data.csv").then((rawData) => {
  console.log("rawData", rawData);
});
