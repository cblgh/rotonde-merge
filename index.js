var fs = require("fs") // investigate using mz/fs instead
var hyperdrive = require("hyperdrive")

var files = ["dat://KEY", "/path/to/file"]
var originPath = "./rotonde.json"

// here's where we keep track of the state per file in the files list
// savedState[key] => state, where key === string(files[i])
var savedState = {}

// read the origin file, the one we merge into
var origin = await getOrigin(originPath)

files.map(function(file) {
    var jsonFile
    if (file.indexOf("dat://") >= 0) {
        // fetch dat stuff
        var archive = hyperdrive(file) // IS THIS RIGHT?? IDK
        processJson(file, jsonFile)
    } else if (file.indexOf("http://") >= 0) { // REPLACE WITH IS URL? REGEX?
        // fetch json
        processJson(file, jsonFile)
    } else {
        // ASSUME IT IS A FILE ON THE HARD DRIVE
        // check to make sure it exists
        fs.readFile(file, function(err, data) {
            if (err) {
                console.error(err)
                process.exit()
            }
            jsonFile = JSON.parse(data)
            processJson(file, jsonFile)
        })
    }
})

// CALLBACK THAT HANDLES A JSON FILE, GETTING ITS ROTONDE CONTENTS
function processJson(key, contents) {
    // get the last known state for this file
    var state = savedState[key]
    // remote contains the json contents of the file??
    var remote = {}

    // get the new posts
    var posts = []

    // figure out if any of the attributes have been changed since last
    var attributes = {}

    // update the in-memory origin file
    merge(origin, posts, attributes)
}

async function getOrigin(origin) {
    return new Promise(function(resolve, reject) {
        fs.readFile(origin, function(err, data) {
            if (err) {
                console.error(err)
                reject(err)
            }
            resolve(JSON.parse(data))
        })
    })
}
