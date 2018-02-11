"use strict"

// Import the dependencies
const cheerio = require("cheerio")
    , req = require("tinyreq")
    ;

// Define the scrape function
function scrape(url, data, cb) {
    // 1. Create the request
    req(url, (err, body) => {
        if (err) { return cb(err); }

        // 2. Parse the HTML
        let $ = cheerio.load(body)
          , pageData = {}
          ;

        // 3. Extract the data
        Object.keys(data).forEach(k => {
            pageData[k] = $(data[k]).text();
        });

        // Send the data in the callback
        cb(null, pageData);
    });
}

//clean up data & put into array
function cleanData(data) {
    const matches = []
    
    // Remove 'noise data'
    const re = /(("name".*\s)|("points".*)|(wildCardRank.*))/g
    let match;
    while ((match = re.exec(data.apiData)) !== null) {
        matches.push(match[0]);
        //console.log(match[0])
    }
    
    // Remove more noise data (too close to needed data & not caught by first clean) 
    const re2 = /"\w+"\s:\s(("National Hockey League")|("[^\d]\w+")),\n/ 
    for(let i=0; i<matches.length; i++) {
        if((match = re2.exec(matches[i])) !==null){
            matches.splice(i, 1)
        }
    }
    
    /* !These matches should have been cleaned by the second regex...but aren't for some reason. 
        Look into this when refactoring! */
    matches.splice(0,1);
    matches.splice(24,1);
    matches.splice(48,1);
    matches.splice(69,1);
    
    // Remove all extraneous characters
    const re3 = /"[^\d]\w+" : / 
    for(let i=0; i<matches.length; i++) {
            matches[i] = matches[i].replace(re3, '')
            matches[i] = matches[i].replace(/[^\d]\w+" : /, '')
            matches[i] = matches[i].replace(/"/, '')
            matches[i] = matches[i].replace(/,\n/, '')
            matches[i] = matches[i].replace(/,/, '')
            matches[i] = matches[i].replace(/"/, '')
    }
    return matches
}

//sort teams into proper standings & remove current playoff teams
function sortStandings(array) {
    const combined = []
    const chunk=3;
    for(let i=0; i<array.length-2; i+=chunk) {
        const tempArray = []
        for (let j=i; j<(i+chunk); j++) tempArray.push(array[j])
            if(parseInt(tempArray[2]) > 2) combined.push(tempArray)    
    }
    
    return combined.sort(sortFunction);
    
    //sort function
    function sortFunction(a, b) {
        if (a[1] === b[1] && a[2] < b[2]) {
            return -1;
        }
        else {
        return (a[1] < b[1]) ? -1 : 1;
        }
    }
}    

// Extract data from NHL.com
scrape("https://statsapi.web.nhl.com/api/v1/standings", {
    // Get the NHL api data 
    apiData: "body"
}, (err, data) => {
    
    //cleaned data array
    const dataArray = cleanData(data)
    //sorted by standings
    const currentStandings = sortStandings(dataArray)
    
    console.log(err || currentStandings);
});