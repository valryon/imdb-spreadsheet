require('dotenv').config()
const { GoogleSpreadsheet } = require('google-spreadsheet');
const http = require('https');

const IgnoreNonEmptyIds = true

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
  const rows = await sheet.getRows({
    offset: 1,
    limit: 10
  }); 
  
  for (const r of rows) {
    await UpdateMovie(r)
  }
}

async function UpdateMovie(r) {
  if(IgnoreNonEmptyIds ==false && r['IMDb ID'] ) {
    console.log("🔕 " + r['Titre nous'])
    return
  }

  // console.dir(r)
  GetMovie(r['Titre nous'], function(movie) {
    r['IMDb ID'] = movie.imdb_id
    r['Link'] = 'https://www.imdb.com/title/' + movie.imdb_id
    r['Cover'] = '=IMAGE(\"' + movie.cover + '\")'
    r['Plot'] = movie.plot
    r['Titre US'] = movie.title
    r['Titre FR'] = movie.titleFR
    r['Genre'] = movie.genre
    r['Année'] = movie.release_year
    r.save()

    console.log("✅ " + r['Titre nous'] + " -> " + r['Titre FR'] + "("+movie.imdb_id+")")
  })
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
        cover : 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/' + result.poster_path,
        plot :  result.overview,
        genre : result.genres[0].name,
        release_year : result.release_date.substring(0, 4)
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

  console.log("🍺 https://"+ options.host + options.path)

  http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      callback(chunk)
    });
  }).end();
}
// ==============================================================================