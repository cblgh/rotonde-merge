var fs = require("mz/fs") 
var path = require("mz/fs")
var hyperdrive = require("hyperdrive")
var request = require("request")
var config = require("./config.js")

// TODO: 
// * add support for dat://<key> in config.files
// * refactor to use functional patterns
// * refactor to allow for relative paths, urls without http://

// the in-memory representation of the merged rotonde.json
var origin
// savedState's where we keep track of the various file states
// savedState[key] => state, where key === string(files[i])
// read the origin file, the one we merge into
var savedState
function createStateFile(filepath) {
    return new Promise(function(resolve, reject) {
        var state = {}
        config.files.forEach(function(file) {
            state[file] = defaultState()
        })
        fs.writeFile(filepath, JSON.stringify(state), function(err) {
            if (err) {
                reject(err)
                console.error(err)
            } else {
                resolve()
            }
        })
    })
}

/*
 what kind of state do we save?
 * the unixtime of the last post
 * portal.profile as it was the last time we loaded
     * if any attribute in portal.profile has changed (remote.current_profile.attrib != remote.previous_profile.attrib=
       then update the corresponding attribute for origin. 
       once all attributes have been checked: set remote.previous_profile = remote.current_profile
*/
function defaultState() {
    return {
        lastTimestamp: 0, 
        profile: {
            name: "",
            location: "",
            color: "",
            position: "",
            avatar: ""
        },
        portal: []
    }
}

path.stat(config.statePath).catch(function(err) {
    return createStateFile(config.statePath)
})
.catch(function(err) {
    console.log("creating state file failed")
    console.error(err)
})
.then(function() {
    return getJSON(config.statePath)
})
.then(function(stateData) {
    savedState = stateData
    return getJSON(config.originPath)
})
.then(function(originData) {
    origin = originData
})
.catch(function(err) {
    console.log("no origin file")
    console.log(err)
    process.exit()
}).then(function() {
    config.files.forEach(function(file) {
        if (file.indexOf("dat://") >= 0) {
            console.log("TODO: dat")
            // fetch dat stuff
            // var archive = hyperdrive(file) // IS THIS RIGHT?? IDK
            // return processJSON(file, jsonFile)
        } else if (file.indexOf("http://") >= 0 || file.indexOf("https://") >= 0) { 
            console.log("http(s)")
            request(file, function(err, resp, data) {
                if (err) {
                    console.error(err)
                    process.exit()
                }
                try {
                    var data = JSON.parse(data)
                } catch (err) {
                    console.log("%s was probably already javascript", file)
                    console.log(err)
                } finally {
                    return processJSON(file, data)
                }
            })
        } else {
            console.log("local file")
            getJSON(file).then(function(data) {
                return processJSON(file, data)
            })
        }
    })
})

function processJSON(key, contents) {
    return new Promise(function(resolve, reject) {
        if (!savedState[key]) { 
            savedState[key] = defaultState()
        }
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
                origin.profile[attr] = current_profile[attr]
            }
        }
        // save the current profile
        state.profile = current_profile

        // get any new posts
        var posts = getNewPosts(state.lastTimestamp, contents.feed)
        posts.forEach(function(post) {
            var dupe = false
            // make sure one of the new posts doesn't already exist yet
            // (switch to using hash if that's added to spec)
            for (var i = 0; i < origin.feed.length; i++) {
                var originPost = origin.feed[i]
                if (parseInt(originPost.time) === parseInt(post.time)) {
                    dupe = true
                    break
                }
            } 
            if (!dupe) {
                origin.feed.push(post)
            }
        })
        // update timestamp of newest post
        if (posts.length > 0) {
            state.lastTimestamp = parseInt(posts[posts.length - 1].time)
        }

        var portals = getPortalChanges(state, contents.portal)
        // remove the unfollowed portals
        portals.removed.forEach(function(portal) {
            var index = origin.portal.indexOf(portal)
            if (index >= 0) {
                console.log("unfollowing", portal)
                origin.portal.splice(index, 1)
            }
        })
        // follow the added portals
        portals.added.forEach(function(portal) {
            // not in origin.portal => we should follow it
            if (origin.portal.indexOf(portal) < 0) {
                console.log("following", portal)
                origin.portal.push(portal)
            }
        })

        savedState[key] = state
        // persist state to disk
        save().then(resolve).catch(reject)
    })
}

// TODO: rewrite this part with functional javascript i.e. filter or something more apt
function getPortalChanges(state, currentPortals) {
    var portals = {removed: [], added: []}
    var removed = []
    // we should unfollow a portal if it was in state.portal but isn't in currentPortals anymore
    state.portal.forEach(function(portal) {
        var index = currentPortals.indexOf(portal)
        if (index < 0) {
            removed.push(state.portal.indexOf(portal))
            portals.removed.push(portal)
        }
    })

    // remove from the state in reverse order, so the indexes aren't affected
    removed.reverse()
    for (var index in removed) {
        state.portal.splice(index, 1)
    }

    // we should follow a portal if it isn't in state.portal, but is in currentPortals
    currentPortals.forEach(function(portal) {
        // portal has been removed if it was in state.portal yet isn't in currentPortals
        var index = state.portal.indexOf(portal)
        if (index < 0) {
            portals.added.push(portal)
            state.portal.push(portal)
        }
    })
    return portals
}

// save the state data and the merged json file
function save() {
    return new Promise(function(resolve, reject) {
        saveJSON(savedState, config.statePath)
        .catch(function(err) {
            console.error("err when saving state in processJSON")
            reject()
        })
        .then(function() {
            return saveJSON(origin, config.originPath)
        })
        .catch(function(err) {
            console.error("err when saving origin in processJSON")
            reject()
        })
        .then(resolve)
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

// save a JSON file
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

// read a file and return it as JSON
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

// get the posts that have been added, and sort the chronologically
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
