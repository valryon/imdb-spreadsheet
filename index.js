require('dotenv').config()
const { GoogleSpreadsheet } = require('google-spreadsheet');
const http = require('https');


// ==============================================================================
// GetMovie("wolf children", function(m) {
//   console.dir(m)
// })
GetSpreadsheet()
.catch((e) => console.error(e.message));

// ==============================================================================

// ==============================================================================
// Google Spreadsheet API
// ==============================================================================
async function GetSpreadsheet() {
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID)

  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });

  await doc.loadInfo(); // loads document properties and worksheets
  
  const sheet = doc.sheetsByIndex[0];
  await sheet.loadCells('A2:A99999'); // loads a range of cells
  console.dir(sheet.cellStats)
  
}

// ==============================================================================

// ==============================================================================
// TMDb API
// ==============================================================================

// Get a movie from a query
function GetMovie(title, callback) {

  CallTMDB('search/movie?query=' + encodeURIComponent(title), function(chunk) {
    var results = JSON.parse(chunk).results
    if(results.length > 0) {
      GetDetail(results[0].id, callback)
    }
  })
}

// Get a movie's details from a TMDB ID
function GetDetail(id, callback) {
  CallTMDB('movie/'+ id +'?', function(chunk) {

      var result = JSON.parse(chunk)
      var movie = {
        id : result.id,
        imdb_id : result.imdb_id,
        title : result.title,
        img : 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/' + result.poster_path,
        plot :  result.overview,
        genre : result.genres[0].name,

      }

      GetTitleFR(id, function(titleFR) {
        movie.titleFR = titleFR
        callback(movie)
      })
  })
}

// Get the movie french title from the TMDB ID
function GetTitleFR(id, callback) {
  CallTMDB('movie/'+ id+ '/alternative_titles?', function(chunk) {

    var result = JSON.parse(chunk)

    var fr = result.titles.find(element => element.iso_3166_1 == "FR")
    var title = ''
    if(fr) {
      title = fr.title
    }

    callback(title)
})
}

// Wrapper for TMDB call
function CallTMDB(path, callback) {
  var options = {
    host: 'api.themoviedb.org',
    path: '/3/' + path + '&api_key=' + process.env.API_KEY,
    method: 'GET'
  };

  console.log("=> https://"+ options.host + options.path)

  http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      callback(chunk)
    });
  }).end();
}
// ==============================================================================