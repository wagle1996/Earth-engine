// Load MODIS NDVI imagery.
var collection = ee.ImageCollection('MODIS/006/MYD13A1').select('NDVI');

// Define reference conditions from the first 10 years of data.
var reference = collection.filterDate('2001-01-01', '2010-12-31')
  // Sort chronologically in descending order.
  .sort('system:time_start', false);

// Compute the mean of the first 10 years.
var mean = reference.mean();

// Compute anomalies by subtracting the 2001-2010 mean from each image in a
// collection of 2011-2014 images. Copy the date metadata over to the
// computed anomaly images in the new collection.
var series = collection.filterDate('2012-01-01', '2014-12-31')
print (series);
// Display cumulative anomalies.
Map.setCenter(84, 27, 5);
Map.addLayer(series.sum().clip(Da),
    {min: -60000, max: 60000, palette: ['FF0000', '000000', '00FF00']}, 'NDVI anomaly');

// Get the timestamp from the most recent image in the reference collection.
var time0 = reference.first().get('system:time_start');



//print (cum);
// Scale the NDVI with fac 0.0001
var scaleNDVI = function(img){
  return img.multiply(0.0001)
}

// scale every image in the collection
var cum = series.map(scaleNDVI);
print (cum)
var counter = 0;
var collectionList = cum.toList(cum.size())
var collectionSize = collectionList.size().getInfo()

// loop through the year
for (var y = 2012; y < 2015 ; y++) {
  // loop through the months
  for (var m = 1; m <= 12 ; m++) {
  // get the image
  var img = ee.Image(collectionList.get(m));
  print (img)

// store the image
  Export.image.toDrive({
       image: img.toFloat(),
       description: y.toString() + m.toString(),
       scale: 1000,
    region: Da
 });
}}

