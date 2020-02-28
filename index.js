require('dotenv').config()
const { GoogleSpreadsheet } = require('google-spreadsheet');
const request = require("request-promise");

const IgnoreNonEmptyIds = false

// ==============================================================================
main()

async function main() {
  try {
    UpdateSpreadsheet()

    // let m = await GetMovie("wolf children")
    // console.dir(m)
  
  } catch(error) {
    console.error(e.message)
  }
}

// ==============================================================================

// ==============================================================================
// Google Spreadsheet API
// ==============================================================================
async function UpdateSpreadsheet() {
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID)

  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });

  await doc.loadInfo(); // loads document properties and worksheets
  
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows({
    // offset: 1
    //limit: 10
  }); 
  
  for (const r of rows) {
    await UpdateMovie(r)
  }
}

async function UpdateMovie(r) {
  let name = r['Nom']
  if(IgnoreNonEmptyIds ==false && r['IMDb ID'] ) {
    console.log("🔕 " + name)
    return
  }

  // console.dir(r)
  const movie = await GetMovie(name)

  if(!movie) {
    console.log("❌ " + name + " not found")
    return
  }

  r['IMDb ID'] = movie.imdb_id
  r['Link'] = 'https://www.imdb.com/title/' + movie.imdb_id
  r['Cover'] = '=IMAGE(\"' + movie.cover + '\")'
  r['Plot'] = movie.plot
  r['Titre Original'] = movie.title
  r['Titre FR'] = movie.titleFR
  r['Genre'] = movie.genre
  r['Année'] = movie.release_year
  r.save()

  console.log("✅ " + r['Titre nous'] + " -> " + (movie.titleFR ? movie.titleFR : movie.title) + " ("+movie.imdb_id+")")
}

// ==============================================================================

// ==============================================================================
// TMDb API
// ==============================================================================

// Get a movie from a query
async function GetMovie(title, callback) {

  const chunk = await CallTMDB('search/movie?query=' + encodeURIComponent(title))

  let results = chunk.results
  if(results.length > 0) {
    const movie = await GetDetail(results[0].id)

    return movie
  }

  return undefined
}

// Get a movie's details from a TMDB ID
async function GetDetail(id) {
  const result = await CallTMDB('movie/'+ id +'?')

  let movie = {
    id : result.id,
    imdb_id : result.imdb_id,
    title : result.title,
    cover : 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/' + result.poster_path,
    plot :  result.overview,
    genre : result.genres.length > 0 ? result.genres[0].name : '',
    release_year : result.release_date.substring(0, 4)
  }

  const titleFR = await GetTitleFR(id)
  movie.titleFR = titleFR
  
  return movie
}

// Get the movie french title from the TMDB ID
async function GetTitleFR(id) {
    const result = await CallTMDB('movie/'+ id+ '/alternative_titles?', function(chunk) {

    let fr = result.titles.find(element => element.iso_3166_1 == "FR")
    let title = ''
    if(fr) {
      title = fr.title
    }

    return title
})
}

// Wrapper for TMDB call
async function CallTMDB(path) {
  let options = {
    method: 'GET',
    url: 'https://api.themoviedb.org/3/' + path + '&api_key=' + process.env.API_KEY
  };

  console.log("🍺 " + options.url)

  const result = await request(options)

  return JSON.parse(result)
}
// ==============================================================================