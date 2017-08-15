var fs = require("fs")
var hyperdrive = require("hyperdrive")

var files = ["dat://KEY", "/path/to/file"]

// here's where we keep track of the state per file in the files list
// savedState[key] => state, where key === string(files[i])
var savedState = {}

files.map(function(file) {
    if (file.indexOf("dat://") >= 0) {
        var archive = hyperdrive(file) // IS THIS RIGHT?? IDK
    } else if (file.indexOf("http://") >= 0) { // REPLACE WITH IS URL? REGEX?
        fetchJson
    } else {
        // ASSUME IT IS A FILE ON THE HARD DRIVE
    }
})

// CALLBACK THAT HANDLES A JSON FILE, GETTING ITS ROTONDE CONTENTS
function processJson() {
}
