var fs = require("mz/fs") 
var path = require("mz/fs")
var hyperdrive = require("hyperdrive")
var request = require("request")

// TODO: add dat://<key>
var files = ["http://test-cblgh.hashbase.io", "/Users/cblgh/code/rotonde-merge/rotonde1.json"]
var originPath = "./rotonde.json"
var statePath = "./state.json"
// the in-memory representation of the merged rotonde.json
var origin

// savedState's where we keep track of the various file states
// savedState[key] => state, where key === string(files[i])
// read the origin file, the one we merge into
var savedState

function createStateFile() {
    return new Promise(function(resolve, reject) {
        var state = {}
        files.map(function(file) {
            state[file] = defaultState()
        })
        fs.writeFile(statePath, JSON.stringify(state), function(err) {
            if (err) {
                reject(err)
                console.error(err)
            } else {
                resolve()
            }
        })
    })
}

function defaultState() {
    return {
        lastTimestamp: 0, 
        profile: {
            name: "",
            location: "",
            color: "",
            position: "",
            avatar: ""
        }
        // TODO: add portals
    }
}

path.stat(statePath).catch(function(err) {
    return createStateFile()
})
.catch(function(err) {
    console.log("creating state file failed")
    console.error(err)
})
.then(function() {
    return getJSON(statePath)
})
.then(function(stateData) {
    savedState = stateData
    console.log(stateData)
    return getJSON(originPath)
})
.then(function(originData) {
    origin = originData
})
.catch(function(err) {
    console.log("no origin file")
    console.log(err)
}).then(function() {
    files.map(function(file) {
        if (file.indexOf("dat://") >= 0) {
            console.log("TODO: dat")
            // fetch dat stuff
            // var archive = hyperdrive(file) // IS THIS RIGHT?? IDK
            // return processJSON(file, jsonFile)
        } else if (file.indexOf("http://") >= 0 || file.indexOf("https://") >= 0) { // REPLACE WITH url.isURL? REGEX?
            console.log("http(s)")
            request(file, function(data) {
                // var data = JSON.parse(data)
                // return processJSON(file, data)
            })
        } else {
            console.log("local file")
            getJSON(file).then(function(data) {
                return processJSON(file, data)
            })
        }
    })
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
function processJSON(key, contents) {
    return new Promise(function(resolve, reject) {
        console.log("origin", origin)
        if (!savedState[key]) { 
            savedState[key] = defaultState()
        }
        console.log(key)
        console.log(contents.profile)
        console.log(key in savedState)
        // get the last known state for this file
        var state = savedState[key]
        
        var saved_profile = state.profile
        var current_profile = contents.profile
        for (var attr in saved_profile) {
            if (saved_profile[attr] !== current_profile[attr]) {
                console.log("saved vs current")
                console.log("%s vs %s", saved_profile[attr], current_profile[attr])
                console.log("the saved profile's %s is different from the current profile", attr)
                console.log("update origin with the newest change")
                origin[attr] = current_profile[attr]
            }
        }
        // save the current profile
        state.profile = current_profile

        // get the new posts
        var posts = getNewPosts(state.lastTimestamp, contents.feed)
        posts.map(function(post) {
            var dupe = false
            // make sure one of the new posts doesn't already exist yet
            // (switch to using hash if that's added to spec)
            for (var i = 0; i < origin.feed.length; i++) {
                var originPost = origin.feed[i]
                if (parseInt(originPost.time) === post.time) {
                    dupe = true
                    break
                }
            } 
            if (!dupe) {
                origin.feed.push(post)
            }
        })

        if (posts.length > 0) {
            state.lastTimestamp = posts[posts.length - 1].time 
        }

        // save state to disk
        savedState[key] = state
        saveJSON(savedState, statePath).catch(function(err) {
            console.error("err when saving state in processJSON")
            reject()
        })
        .then(function() {
            return saveJSON(origin, originPath)
        })
        .catch(function(err) {
            console.error("err when saving origin in processJSON")
            reject()
        })
        .then(function() {
            resolve()
        })
    })
}

function compare(a, b) {
    var first = parseInt(a.time)
    var second = parseInt(b.time)
    if (first < second) {
        return 1
    } else if (first > second) {
        return -1
    }
    return 0
}

function saveJSON(data, filepath) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(filepath, JSON.stringify(data), function(err) {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

function getJSON(filepath) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filepath)
        .then(function(data) {
            resolve(JSON.parse(data))
        })
        .catch(function(err) {
            reject(err)
        })
    })
}

function getNewPosts(timestamp, posts) {
    timestamp = parseInt(timestamp)
    var newPosts = []
    posts.forEach(function(post) {
        if (parseInt(post.time) > timestamp) {
            newPosts.push(post)
        }
    })

    newPosts.sort(compare)
    return newPosts
}
