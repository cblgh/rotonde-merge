module.exports = {
    // absolute path to the merged file you want to serve e.g. /http/rotonde/public/rotonde.json
    originPath: "", 
    
    // absolute path to your state e.g. /path/to/rotonde-merge/state.json
    statePath: "", 
    
    // rotonde files you want to merge into one
    // supported types are:
    // * local file system paths /path/to/rotonde.json
    // * http(s) urls e.g. http://rotonde.json.org, or http://rotonde.org/rotonde.json
    //   note: it's important to include http:// or https:// for URLs
    // e.g. files: ["http://rotonde.xxiivv.com", "/home/xxiivv/rotonde/rotonde.json"]
    files: []
}
