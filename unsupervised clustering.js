//Unsupervised clustering/classification

//Load landsat 8 image collection.
/* Function to mask clouds based on the pixel_qa band of Landsat 8 SR data.
 * @param {ee.Image} image input Landsat 8 SR image
 * @return {ee.Image} cloudmasked Landsat 8 image
 */
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 3);
  var cloudsBitMask = (1 << 5);

  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                 .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
  
}

//load LS8 collection SR image
var landsatCollection = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR")
    .filterDate('2015-01-01', '2015-12-31')
    .filterBounds(geometry)
    .map(maskL8sr)
    
    //var image=landsatCollection.mean()
    //var image=landsatCollection.median()
    var image=landsatCollection.median()
    image = image.toUint16()
    
    
//snow cover extraction
var snowbitmask=1<<4;
var sa = image.select('pixel_qa');
var snow= sa.bitwiseAnd(snowbitmask).neq(0)
Map.addLayer(snow, {}, 'snow');

//Define visula parameters
var vizParams = {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 0.95,
  gamma: [0.95, 1.1, 1]
};

//Add layer to map
//Map.addLayer(image.clip(geometry), vizParams, 'true color composite');

// Make the training dataset.
var training = image.sample({
  region: geometry,
  scale: 30,
  numPixels: 5000
});

//Instantiate the clusterer and train it.
var clusterer = ee.Clusterer.wekaKMeans(100).train(training);

// Cluster the input using the trained clusterer.
var result = image.cluster(clusterer);
//print (result);
//print (clusterer);

// Display the clusters with random colors.
//Map.addLayer(result.randomVisualizer().clip(geometry), {}, 'clusters');
// Reduce the region. The region parameter is the Feature geometry.
//var meanDictionary = result.reduceRegion({
  //reducer: ee.Reducer.mean(),
  //geometry: geometry.geometry(),
  //scale: 30,
 // maxPixels: 1e9
//});

// The result is a Dictionary.  Print it.
//print(meanDictionary);

//Export and save LS8 SF to google drive.
// Export.image.toDrive({
//   image: image,
//   description: "landsat8_surface_ref",
//   scale: 30,
//   region: geometry
// });

//Export and save LS8 based snow to drive.
// Export.image.toDrive({
//   image: snow,
//   // description: "snow_mean",
//   // description: "snow_median",
//   description: "snow_mosaic",
//   scale: 30,
//   region: geometry
// });
Export.image.toDrive({
  image: result,
  // description: "snow_mean",
  // description: "snow_median",
  description: "cluster",
  scale: 30,
  region: geometry
});