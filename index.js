var fs = require("fs") // investigate using mz/fs instead
var hyperdrive = require("hyperdrive")

var files = ["dat://KEY", "http://url.to.rotonde.json", "/path/to/file"]
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

/*
 what kind of state do we save?
 * the unixtime of the last post
 * portal.profile as it was the last time we loaded
     * if any attribute in portal.profile has changed (remote.current_profile.attrib != remote.previous_profile.attrib=
       then update the corresponding attribute for origin. 
       once all attributes have been checked: set remote.previous_profile = remote.current_profile

*/

// CALLBACK THAT HANDLES A JSON FILE, GETTING ITS ROTONDE CONTENTS
function processJson(key, contents) {
    // get the last known state for this file
    var state = savedState[key]
    
    var saved_profile = state.profile
    var current_profile = contents.profile
    for (var attr in saved_profile) {
        if (saved_profile[attr] !== current_profile[attr]) {
            console.log("the saved profile is different from the current profile")
            console.log("update origin with the newest change")
            origin[attr] = current_profile[attr]
        }
    }
    // save the current profile
    state.profile = current_profile

    // get the new posts
    var posts = getNewPosts(state.newestPost, contents.feed)

    // figure out if any of the attributes have been changed since last
    var attributes = {}

    // update the in-memory origin file
    // merge(origin, posts, attributes)
}

function getNewPosts(timestamp, posts) {
    var newPosts = []
    posts.forEach(function(post) {
        console.log(post)
        if (parseInt(post.timestamp) > timestamp {
            newPosts.push(post)
        })
    })
    return posts
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
