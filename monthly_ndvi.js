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
//.map(function(image) {return image.subtract(mean).set('system:time_start', image.get('system:time_start'));
//});
print (series);
// Display cumulative anomalies.
Map.setCenter(84, 27, 5);
Map.addLayer(series.sum().clip(Da),
    {min: -60000, max: 60000, palette: ['FF0000', '000000', '00FF00']}, 'NDVI anomaly');

// Get the timestamp from the most recent image in the reference collection.
var time0 = reference.first().get('system:time_start');

// Use imageCollection.iterate() to make a collection of cumulative anomaly over time.
// The initial value for iterate() is a list of anomaly images already processed.
// The first anomaly image in the list is just 0, with the time0 timestamp.
var first = ee.List([
  // Rename the first band 'NDVI'.
  ee.Image(0).set('system:time_start', time0).select([0], ['NDVI'])
]);

// This is a function to pass to Iterate().
// As anomaly images are computed, add them to the list.
// var accumulate = function(image, list) {
//   // Get the latest cumulative anomaly image from the end of the list with
//   // get(-1).  Since the type of the list argument to the function is unknown,
//   // it needs to be cast to a List.  Since the return type of get() is unknown,
//   // cast it to Image.
//   var previous = ee.Image(ee.List(list).get(-1));
//   // Add the current anomaly to make a new cumulative anomaly image.
//   var added = image.add(previous)
//     // Propagate metadata to the new image.
//     .set('system:time_start', image.get('system:time_start'));
//   // Return the list with the cumulative anomaly inserted.
//   return ee.List(list).add(added);
// };

// Comment
var tofloat=function(image){
  return image.toFloat()
};

//print (accumulate);
// };

// Create an ImageCollection of cumulative anomaly images by iterating.
// Since the return type of iterate is unknown, it needs to be cast to a List.


// var cumulative = ee.ImageCollection(ee.List(series.iterate(accumulate, first)));
//var cum= tofloat(cumulative)
// print (cumulative);
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

