module.exports = {
    // absolute path to the single file you want to serve, the merged rotonde.json
    originPath: "", 
    // absolute path to your state
    statePath: "", 
    // rotonde files you want to merge into one
    // supported types are:
    // * local file system paths /path/to/rotonde.json
    // * http(s) urls e.g. http://rotonde.json.org, or http://rotonde.org/rotonde.json
    //   note: it's important to include http:// or https:// for URLs
    files: []
}
