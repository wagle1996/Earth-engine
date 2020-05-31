**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = ee.FeatureCollection("users/wagle1996/Shapefile_location"),
    urban = ee.FeatureCollection("users/wagle1996/urban"),
    vegetation = ee.FeatureCollection("users/wagle1996/vegetation"),
    water = ee.FeatureCollection("users/wagle1996/water");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// This demonstration uses hand-located points to train a classifier.
// Each training point has a field called 'landcover' containing
// class labels at that location. The following block contains
// construction code for the points.  Hover on the 'urban' variable
// and click, 'Convert' in the dialog.
// year of start and end
var preYear=2012
var postYear=2017

//var maxPoints = 200; // Maximum points per strata (suggest 200)
//var nPixels = 100000; // Number of pixels to sample in region (set high to catch rare classes)
var exportName = 'Change_' + preYear + '_' + postYear;
// Load the Landsat 8 scaled radiance image collection.
var landsatCollection = ee.ImageCollection('LANDSAT/LC08/C01/T1')
    .filterDate('2017-11-01', '2017-11-30')
    .filterBounds(geometry);
//for different year
var landsatCollection1 = ee.ImageCollection('LANDSAT/LC08/C01/T1')
    .filterDate('2014-11-01', '2014-11-30')
    .filterBounds(geometry);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Make a cloud-free composite.
var composite = ee.Algorithms.Landsat.simpleComposite({
  collection: landsatCollection,
  asFloat: true
});
// Make a cloud-free composite for different year
var composite1 = ee.Algorithms.Landsat.simpleComposite({
  collection: landsatCollection1,
  asFloat: true
});
// Merge the three geometry layers into a single FeatureCollection.
var newfc = urban.merge(vegetation).merge(water);

// Use these bands for classification.
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7'];
// The name of the property on the points storing the class label.
var classProperty = 'landcover';

// Sample the composite to generate training data.  Note that the
// class label is stored in the 'landcover' property.
var training = composite.select(bands).sampleRegions({
  collection: newfc,
  properties: [classProperty],
  scale: 30
});
// Sample the composite1 to generate training data.  Note that the
// class label is stored in the 'landcover' property.
var training1 = composite1.select(bands).sampleRegions({
  collection: newfc,
  properties: [classProperty],
  scale: 30
});

// Train a CART classifier.
var classifier = ee.Classifier.smileCart().train({
  features: training,
  classProperty: classProperty,
});
// Train a CART classifier for next year image.
var classifier1 = ee.Classifier.smileCart().train({
  features: training1,
  classProperty: classProperty,
});
// Print some info about the classifier (specific to CART).
print('CART, explained', classifier.explain());
// Print some info about the classifier (specific to CART).
print('CART, explained', classifier1.explain());

// Classify the composite.
var classified = composite.classify(classifier);
Map.centerObject(newfc);
Map.addLayer(classified.clip(geometry), {min: 0, max: 2, palette: ['red', 'green', 'blue']});
//classify 2nd composite
var classified1 = composite1.classify(classifier1);
Map.centerObject(newfc);
Map.addLayer(classified1.clip(geometry), {min: 0, max: 2, palette: ['red', 'green', 'blue']});

// Optionally, do some accuracy assessment.  Fist, add a column of
// random uniforms to the training dataset.
var withRandom = training.randomColumn('random');
// Optionally, do some accuracy assessment.  Fist, add a column of
// random uniforms to the training1 dataset.
var withRandom1 = training1.randomColumn('random');

// We want to reserve some of the data for testing, to avoid overfitting the model.
var split = 0.7;  // Roughly 70% training, 30% testing.
var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
var testingPartition = withRandom.filter(ee.Filter.gte('random', split));
// We want to reserve some of the data for testing1, to avoid overfitting the model.
var split = 0.7;  // Roughly 70% training, 30% testing.
var trainingPartition1 = withRandom1.filter(ee.Filter.lt('random', split));
var testingPartition1 = withRandom1.filter(ee.Filter.gte('random', split));

// Trained with 70% of our data.
var trainedClassifier = ee.Classifier.smileRandomForest(5).train({
  features: trainingPartition,
  classProperty: classProperty,
  inputProperties: bands
});
// Trained with 70% of our next data.
var trainedClassifier1 = ee.Classifier.smileRandomForest(5).train({
  features: trainingPartition1,
  classProperty: classProperty,
  inputProperties: bands
});

// Classify the test FeatureCollection.
var test = testingPartition.classify(trainedClassifier);
// Classify the test FeatureCollection2.
var test1 = testingPartition1.classify(trainedClassifier1);

// Print the confusion matrix.
var confusionMatrix = test.errorMatrix(classProperty, 'classification');
print('Confusion Matrix', confusionMatrix);
// Print the confusion matrix.
var confusionMatrix1 = test1.errorMatrix(classProperty, 'classification');
print('Confusion Matrix1', confusionMatrix1);
var preImageFull = classified.clip(geometry);
var postImageFull = classified1.clip(geometry)
//change detection
var preImage = simplifyMap(preImageFull).rename('Mode');
var postImage = simplifyMap(postImageFull).rename('Mode');

var changeImage = preImage.multiply(10).add(postImage).rename('change');
var binaryChange = changeImage.remap([0,11,22,33,44,55],[0,0,0,0,0,0],1);

// Frequency histogram for full study region (SR)
var counts = changeImage.reduceRegion({
    reducer: ee.Reducer.frequencyHistogram(),
    geometry: geometry,
    scale: 500,
    maxPixels: 1e13
    }).get('change');
print(counts);

// Stratified Sampling
//var stratified = ee.Dictionary(counts)
    //.map(function(klass, count) {
   //   klass = ee.Number.parse(klass);
   //   var masked = changeImage.updateMask(changeImage.eq(klass));
     // return masked.addBands(ee.Image.pixelLonLat())
         // .sample({region: geometry, scale: 500, numPixels: nPixels, seed: klass})
         // .randomColumn('x')              // Random, but spatially ordered.  Reorder.
        //  .sort('x')
        //  .limit(ee.Number(count).floor().min(maxPoints))
        //  .map(function(f) {              // Extract a location for each point, for display
        //      var location = ee.Geometry.Point([f.get('longitude'), f.get('latitude')]);
        //      return ee.Feature(location, f.toDictionary());
       //   });
 //   }).values();
//stratified = ee.FeatureCollection(stratified).flatten();
//print(stratified.reduceColumns(ee.Reducer.frequencyHistogram(),['change']).get('histogram'));
//print(stratified.size());

//Export.table.toDrive(stratified,exportName);


// VISUALIZATION

// Visualize full assemblage
var classStructFull = 
{ 'Other': {number: 0, color: '6f6f6f'},
  'Surface Water': {number: 1, color: 'aec3d4'},
  'Snow and Ice': {number: 2, color: 'b1f9ff'},
  'Mangrove': {number: 3, color: '111149'},
  'Closed forest': {number: 4, color: '152106'},
  'Open forest': {number: 5, color: '115420'},
  'Otherwoodedland': {number: 6, color: '387242'},
  'Settlement': {number: 7, color: 'cc0013'},
  'Cropland': {number: 8, color: '8dc33b'},
  'Wetlands': {number: 9, color: '3bc3b2'},
  'Grassland': {number: 10, color: 'f4a460'}
};

// Get list of class names, probability layer names, and palette colors
var classNamesListFull = getIds(classStructFull);
var classNamesFull = ee.List(classNamesListFull);
var classNumbersFull = getList(classStructFull,'number');
var PALETTE_listFull = getList(classStructFull,'color');
var PALETTEFull = PALETTE_listFull.join(',');

Map.centerObject(geometry,6);
//Map.addLayer(preImageFull,{palette:PALETTEFull,min:0,max:classNamesListFull.length-1},'Full Map PRE');
//Map.addLayer(postImageFull,{palette:PALETTEFull,min:0,max:classNamesListFull.length-1},'Full Map POST');

// Visualize simplified assemblage
var classStruct = 
{ 'Other': {number: 0, color: '6f6f6f'},
  'Water': {number: 1, color: 'aec3d4'},
  'Forest': {number: 2, color: '115420'},
  'Settlement': {number: 3, color: 'cc0013'},
  'Cropland': {number: 4, color: '8dc33b'},
  'Grassland': {number: 5, color: 'f4a460'}
};

// Get list of class names, probability layer names, and palette colors
var classNamesList = getIds(classStruct);
var classNames = ee.List(classNamesList);
var classNumbers = getList(classStruct,'number');
var PALETTE_list = getList(classStruct,'color');
var PALETTE = PALETTE_list.join(',');

//Map.addLayer(preImage,{palette:PALETTE,min:0,max:classNamesList.length-1},'Simple Map PRE');
//Map.addLayer(postImage,{palette:PALETTE,min:0,max:classNamesList.length-1},'Simple Map POST');

//Visualize change/no-change
Map.addLayer(binaryChange,{min:0,max:1},'Change/No-Change');

////////////////////////////////////////////////////////////////////////////////
// FUNCTIONS
////////////////////////////////////////////////////////////////////////////////
function simplifyMap(image){
  // Simplify to six classes (unknown,water,forest,settlement,cropland,grassland)
  image = image.remap([0,1,2,3,4,5,6,7,8,9,10],
                      [0,1,0,2,2,2,2,3,4,1,5]);
  return image;
}

///////////////////////////////////////////////////////////////////////////////
// Function to get the year from an image collection
function getYearlyImage(collection,year) {
  return ee.Image(collection.filterDate(
    ee.Date.fromYMD(year,1,1),ee.Date.fromYMD(year,12,31)).first());
}

///////////////////////////////////////////////////////////////////////////////
// // Function to get a list of column values from a structure
// function getList(struct,column){
//   return Object.keys(struct).map(function(k){
//     var value = struct[k][column];
//     return value;
//   });
// }

///////////////////////////////////////////////////////////////////////////////
// Function to get a list of ids (keys) from a structure
function getIds(struct){
  return Object.keys(struct);
}
