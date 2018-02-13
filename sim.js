"use strict"

// Import the dependencies
const cheerio = require("cheerio")
    , req = require("tinyreq")
    

/**
 * Scrapes the given url
 * @param {string} url - the url
 * @param {object} data - extracted data
 * @param {function} cb - callback
 */
function scrape(url, data, cb) {
    req(url, (err, body) => {
        if (err) { return cb(err); }

        let $ = cheerio.load(body)
          , pageData = {}
          
        Object.keys(data).forEach(k => {
            pageData[k] = $(data[k]).text()
        })

        cb(null, pageData)
    })
}

/**
 * clean up data & put into array
 * @param {array} data - data from page scrape
 * @return {array} matches - matched data (cleaned)
 */
function cleanData(data) {
    const matches = []
    
    // Remove 'noise data'
    const re = /(("name".*\s)|("points".*)|(wildCardRank.*))/g
    let match
    while ((match = re.exec(data.apiData)) !== null) {
        matches.push(match[0])
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
    matches.splice(0,1)
    matches.splice(24,1)
    matches.splice(48,1)
    matches.splice(69,1)
    
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

/**
 * sort the data into NHL standings
 * @param {array} array - cleaned data to be sorted into standings
 * @return {array} combined - standings sorted worst to best with odds and lottery ranges
 */
function sortStandings(array) {
    const combined = []
    const chunk=3
    for(let i=0; i<array.length-2; i+=chunk) {
        const tempArray = []
        for (let j=i; j<(i+chunk); j++) tempArray.push(array[j])
            if(parseInt(tempArray[2]) > 2) combined.push(tempArray)    
    }
    
    //add ranges & odds for lottery selections
    const ranges = [[1,180], [181, 305], [306,410], [411,505], [506,590], [591,666], [667,733], [734,791], [792,845], [846,890], [891,923], [924,950], [951,972], [972,990], [991,1000]]
    const odds = [18.0, 12.5, 10.5, 9.5, 8.5, 7.6, 6.7, 5.8, 5.4, 4.5, 3.3, 2.7, 2.2, 1.8, 1.0]
    combined.sort(sortFunction)
    for(let i=0; i<combined.length; i++){
           combined[i].push(odds[i], ranges[i])       
    }
    return combined

    //sort function
    function sortFunction(a, b) {
        if (a[1] === b[1] && a[2] > b[2]) {
            return -1
        }
        else {
        return (a[1] < b[1]) ? -1 : 1
        }
    }
}    
/**
 * takes the current NHL standings and applies the draft lottery odds to each team then simulates the draft lottery
 * @param {array} original - original standings (before simulating draft lottery)
 */
function simLottery(original){
    let first 
    let second
    let third
    let draw = 0
    const draftOrder = original
    for (let i=0; i<3; i++){
        draw = Math.floor(Math.random() * 1000 + 1)
        if (first === undefined){
            for(let i=0; i<original.length; i++){
                if(draw >= original[i][4][0] && draw <= original[i][4][1]) first = original[i]
            }
        }
        else if (second === undefined){
            //re-do draw if drawn number is within first pick's range
            while(draw >= first[4][0] && draw <= first[4][1]) draw = Math.floor(Math.random() * 1000 + 1)
            for(let i=0; i<original.length; i++){
                if(draw >= original[i][4][0] && draw <= original[i][4][1]) second = original[i]
            }
        }
        else {
            //re-do draw if drawn number is within first or second pick's range
            while((draw >= first[4][0] && draw <= first[4][1])
            || (draw >= second[4][0] && draw <= second[4][1])) draw = Math.floor(Math.random() * 1000 + 1)
            for(let i=0; i<original.length; i++){
                if(draw >= original[i][4][0] && draw <= original[i][4][1]) third = original[i]
            }
        }
    }
    
    const lotteryPicks = [third, second, first]
    for (let i=2; i>=0; i--){
        const index = draftOrder.indexOf(lotteryPicks[i])
        console.log(index)
        draftOrder.splice(index,1)
        draftOrder.unshift(lotteryPicks[i])
    }
    for (let i=0; i<3; i++) console.log("Winner Pick ", i+1, ": ", lotteryPicks[i][0])
    console.log('\nNew Draft Order\n')
    for (let i=0; i<9; i++) console.log(i+1, ' :', draftOrder[i][0])
    for (let i=9; i<draftOrder.length; i++) console.log(i+1, ':', draftOrder[i][0])
}

/**
 * Extract data from NHL.com
 */
scrape("https://statsapi.web.nhl.com/api/v1/standings", {
    // Get the NHL api data 
    apiData: "body"
}, (err, data) => {
    
    //cleaned data array
    const dataArray = cleanData(data)
    //sorted by standings
    const currentStandings = sortStandings(dataArray)
    
    //simulate lottery
    simLottery(currentStandings)
    if (err) console.log(err)
})